"""
Backend Test Suite — pytest
Tests all major API endpoints using FastAPI TestClient.
Run: pytest tests/ -v --tb=short
"""
import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from app import app

client = TestClient(app)


# ─────────────────────────────────────────────────────────────────────────────
# Health Checks
# ─────────────────────────────────────────────────────────────────────────────

def test_root():
    r = client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "online"
    assert "pipeline_modules" in data


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"


def test_pipeline_spec():
    r = client.get("/pipeline")
    assert r.status_code == 200
    stages = r.json()["stages"]
    assert len(stages) == 7
    assert stages[0]["step"] == 1


# ─────────────────────────────────────────────────────────────────────────────
# Growth Prediction
# ─────────────────────────────────────────────────────────────────────────────

def test_predict_linear():
    r = client.post("/predict", json={
        "times": [0, 30, 60],
        "volumes": [10.0, 14.0, 18.0],
        "future_days": [30, 60, 90],
    })
    assert r.status_code == 200
    data = r.json()
    assert data["model_used"] in ("linear", "exponential")
    assert "predictions" in data
    assert data["predictions"]["day_30"] > 0


def test_predict_needs_two_points():
    r = client.post("/predict", json={
        "times": [0],
        "volumes": [10.0],
    })
    assert r.status_code == 422


def test_predict_mismatched_lengths():
    r = client.post("/predict", json={
        "times": [0, 30],
        "volumes": [10.0],
    })
    assert r.status_code == 400


# ─────────────────────────────────────────────────────────────────────────────
# Digital Twin Simulation
# ─────────────────────────────────────────────────────────────────────────────

def test_simulate_no_therapy():
    r = client.post("/simulate", json={
        "times": [0, 30, 60],
        "volumes": [10.0, 15.0, 22.0],
        "days": 60,
        "therapy": 0.0,
    })
    assert r.status_code == 200
    data = r.json()
    sim = data["simulation"]
    assert len(sim["trajectory"]) == 61  # 0..60
    assert sim["final_volume"] > sim["initial_volume"]  # untreated, should grow


def test_simulate_aggressive_therapy():
    r = client.post("/simulate", json={
        "times": [0, 30, 60],
        "volumes": [10.0, 15.0, 22.0],
        "days": 60,
        "therapy": 3.0,
    })
    assert r.status_code == 200
    data = r.json()
    # Aggressive therapy should reduce final vs no-therapy
    assert data["simulation"]["volume_change_pct"] < 50


def test_compare_therapies():
    r = client.post("/compare-therapies", json={
        "times": [0, 30, 60],
        "volumes": [10.0, 15.0, 22.0],
        "days": 60,
    })
    assert r.status_code == 200
    data = r.json()
    assert "therapy_comparison" in data
    assert len(data["therapy_comparison"]) == 4


# ─────────────────────────────────────────────────────────────────────────────
# RL Optimizer
# ─────────────────────────────────────────────────────────────────────────────

def test_optimize_heuristic():
    r = client.post("/optimize", json={
        "times": [0, 30, 60],
        "volumes": [10.0, 15.0, 22.0],
        "days": 60,
        "use_rl": False,
    })
    assert r.status_code == 200
    data = r.json()
    rec = data["recommendation"]
    assert rec["best_therapy"]
    assert "strategy_comparison" in data
    assert rec["final_volume"] >= 0


# ─────────────────────────────────────────────────────────────────────────────
# Multi-Modal Fusion
# ─────────────────────────────────────────────────────────────────────────────

def test_fusion_vector():
    r = client.post("/fusion", json={
        "radiomics": {"shape_Sphericity": 0.6, "firstorder_Entropy": 4.5},
        "clinical": {"age": 55, "kps": 80},
        "genomic": {"idh1": False, "mgmt": True},
    })
    assert r.status_code == 200
    data = r.json()
    assert data["vector_dim"] == 64
    assert len(data["patient_state_vector"]) == 64


# ─────────────────────────────────────────────────────────────────────────────
# Survival Prediction
# ─────────────────────────────────────────────────────────────────────────────

def test_survival_basic():
    r = client.post("/survival/predict", json={
        "age": 55,
        "kps_score": 80,
        "tumor_grade": 4,
        "idh_mutation": False,
        "mgmt_methylation": True,
        "tumor_volume_cc": 30.0,
        "growth_rate_alpha": 0.02,
    })
    assert r.status_code == 200
    data = r.json()
    assert data["median_os_months"] > 0
    assert data["risk_level"] in ("Low", "Intermediate", "High", "Very High")
    assert "kaplan_meier_curve" in data


def test_survival_idh_favorable():
    """IDH mutant should have much better prognosis than IDH wild-type."""
    r_wt = client.post("/survival/predict", json={
        "age": 55, "kps_score": 80, "tumor_grade": 4,
        "idh_mutation": False, "mgmt_methylation": False,
        "tumor_volume_cc": 30.0, "growth_rate_alpha": 0.02,
    })
    r_mut = client.post("/survival/predict", json={
        "age": 55, "kps_score": 80, "tumor_grade": 4,
        "idh_mutation": True, "mgmt_methylation": False,
        "tumor_volume_cc": 30.0, "growth_rate_alpha": 0.02,
    })
    os_wt  = r_wt.json()["median_os_months"]
    os_mut = r_mut.json()["median_os_months"]
    assert os_mut > os_wt  # IDH mutant should have better OS


def test_survival_reference_curves():
    r = client.get("/survival/reference")
    assert r.status_code == 200
    data = r.json()
    assert "cohorts" in data
    assert len(data["cohorts"]) == 4


# ─────────────────────────────────────────────────────────────────────────────
# Patient CRUD
# ─────────────────────────────────────────────────────────────────────────────

def test_create_and_fetch_patient():
    pid = "TEST-PYTEST-001"
    # Create
    r = client.post("/patient/create", json={
        "patient_id": pid,
        "name": "Test Patient",
        "age": 45,
        "gender": "Female",
        "diagnosis": "Glioblastoma",
        "kps_score": 90,
        "tumor_grade": 4,
        "idh_mutation": True,
        "mgmt_methylation": True,
    })
    assert r.status_code == 200

    # Fetch
    r2 = client.get(f"/patient/{pid}")
    assert r2.status_code == 200
    data = r2.json()
    assert data["patient"]["patient_id"] == pid
    assert data["patient"]["idh_mutation"] is True

    # Cleanup
    client.delete(f"/patient/{pid}")


def test_patient_not_found():
    r = client.get("/patient/NONEXISTENT-999")
    assert r.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# Analytics
# ─────────────────────────────────────────────────────────────────────────────

def test_analytics_overview():
    r = client.get("/analytics/overview")
    assert r.status_code == 200
    data = r.json()
    assert "patient_statistics" in data
    assert "tumor_volume_statistics" in data


def test_cohort_filter():
    r = client.post("/analytics/cohort", json={"tumor_grade": 4})
    assert r.status_code == 200
    data = r.json()
    assert "cohort_size" in data


# ─────────────────────────────────────────────────────────────────────────────
# Interpretation
# ─────────────────────────────────────────────────────────────────────────────

def test_feature_interpretation():
    r = client.post("/interpret", json={
        "features": {
            "shape_Sphericity": 0.54,
            "firstorder_Entropy": 5.12,
            "glcm_Contrast": 187.4,
        }
    })
    assert r.status_code == 200
    data = r.json()
    assert data["feature_count"] == 3
    assert len(data["interpreted_features"]) == 3


# ─────────────────────────────────────────────────────────────────────────────
# Seeding, Reports, Updates & Trajectories
# ─────────────────────────────────────────────────────────────────────────────

def test_seed_database_endpoint():
    r = client.post("/seed", json={"force": True})
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert data["patients_seeded"] == 5
    assert data["scans_seeded"] > 0


def test_sample_mri_endpoint():
    r = client.post("/sample/mri")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert data["sample_mode"] is True
    assert data["volume_cc"] > 0
    assert "radiomics" in data


def test_patient_update():
    # Update Marcus Vance's KPS score
    r = client.put("/patient/NDT-001", json={
        "kps_score": 85,
        "diagnosis": "Glioblastoma Multiforme (WHO Grade IV, Post-Surgery)"
    })
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "updated"

    # Verify update
    r2 = client.get("/patient/NDT-001")
    assert r2.status_code == 200
    assert r2.json()["patient"]["kps_score"] == 85


def test_patient_report_detailed():
    r = client.get("/analytics/patient/NDT-001/report")
    assert r.status_code == 200
    data = r.json()
    assert data["report_type"] == "full_clinical_summary"
    assert "patient" in data
    assert "scan_summary" in data
    assert data["scan_summary"]["total_scans"] >= 2
    assert "generated_at" in data


def test_compare_therapies_has_trajectories():
    r = client.post("/compare-therapies", json={
        "times": [0, 30, 60],
        "volumes": [15.0, 20.0, 28.0],
        "days": 60,
    })
    assert r.status_code == 200
    data = r.json()
    comparison = data["therapy_comparison"]
    for label, strategy in comparison.items():
        assert "trajectory" in strategy
        assert len(strategy["trajectory"]) == 61
        assert "days" in strategy

