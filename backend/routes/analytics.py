"""
Analytics & Reporting Route
Provides aggregate statistics, patient cohort analysis, and PDF-ready summaries.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from database import get_db, Patient, Scan, GrowthRecord, TherapySimulation
from sqlalchemy import func
import numpy as np

router = APIRouter()


@router.get("/analytics/overview", summary="Platform-wide analytics overview")
def analytics_overview(db: Session = Depends(get_db)):
    """Returns aggregate statistics across all patients and scans."""
    try:
        total_patients = db.query(func.count(Patient.id)).scalar() or 0
        total_scans    = db.query(func.count(Scan.id)).scalar() or 0

        # Volume stats
        volumes = db.query(Scan.tumor_volume_cc).filter(Scan.tumor_volume_cc.isnot(None)).all()
        vol_vals = [v[0] for v in volumes if v[0] is not None]

        # Genomic stats
        idh_count  = db.query(func.count(Patient.id)).filter(Patient.idh_mutation == True).scalar() or 0
        mgmt_count = db.query(func.count(Patient.id)).filter(Patient.mgmt_methylation == True).scalar() or 0
        grade4     = db.query(func.count(Patient.id)).filter(Patient.tumor_grade == 4).scalar() or 0

        return {
            "patient_statistics": {
                "total_patients": total_patients,
                "total_scans": total_scans,
                "avg_scans_per_patient": round(total_scans / max(total_patients, 1), 1),
            },
            "tumor_volume_statistics": {
                "count": len(vol_vals),
                "mean_cc": round(float(np.mean(vol_vals)), 2) if vol_vals else None,
                "median_cc": round(float(np.median(vol_vals)), 2) if vol_vals else None,
                "min_cc": round(float(np.min(vol_vals)), 2) if vol_vals else None,
                "max_cc": round(float(np.max(vol_vals)), 2) if vol_vals else None,
                "std_cc": round(float(np.std(vol_vals)), 2) if vol_vals else None,
            },
            "genomic_biomarker_rates": {
                "idh_mutation_pct": round(idh_count / max(total_patients, 1) * 100, 1),
                "mgmt_methylation_pct": round(mgmt_count / max(total_patients, 1) * 100, 1),
                "grade_4_pct": round(grade4 / max(total_patients, 1) * 100, 1),
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/patient/{patient_id}/report", summary="Full patient clinical report")
def patient_report(patient_id: str, db: Session = Depends(get_db)):
    """
    Generates a comprehensive summary report for a single patient.
    Includes scan history, growth trajectory, risk assessment, and therapy recommendations.
    """
    patient = db.query(Patient).filter_by(patient_id=patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    scans = db.query(Scan).filter_by(patient_id=patient_id).order_by(Scan.scan_date).all()
    therapies = db.query(TherapySimulation).filter_by(patient_id=patient_id).order_by(
        TherapySimulation.created_at.desc()
    ).first()

    # Compute volume trend
    volumes = [s.tumor_volume_cc for s in scans if s.tumor_volume_cc]
    trend_pct = None
    if len(volumes) >= 2:
        trend_pct = round((volumes[-1] - volumes[0]) / max(volumes[0], 0.001) * 100, 1)

    return {
        "report_type": "full_clinical_summary",
        "generated_at": "2026-02-22T11:24:20+05:30",
        "patient": {
            "patient_id": patient.patient_id,
            "name": patient.name,
            "age": patient.age,
            "gender": patient.gender,
            "diagnosis": patient.diagnosis,
            "kps_score": patient.kps_score,
            "tumor_grade": patient.tumor_grade,
            "genomics": {
                "idh_mutation": patient.idh_mutation,
                "mgmt_methylation": patient.mgmt_methylation,
                "egfr_amplification": patient.egfr_amplification,
                "tp53_mutation": patient.tp53_mutation,
            },
        },
        "scan_summary": {
            "total_scans": len(scans),
            "first_scan": scans[0].scan_date if scans else None,
            "latest_scan": scans[-1].scan_date if scans else None,
            "latest_volume_cc": volumes[-1] if volumes else None,
            "volume_trend_pct": trend_pct,
        },
        "therapy_recommendation": {
            "best_therapy": therapies.best_therapy if therapies else None,
            "predicted_reduction_pct": therapies.volume_reduction_pct if therapies else None,
        } if therapies else None,
    }


class CohortRequest(BaseModel):
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    tumor_grade: Optional[int] = None
    idh_mutation: Optional[bool] = None
    mgmt_methylation: Optional[bool] = None


@router.post("/analytics/cohort", summary="Filter and analyze a patient cohort")
def cohort_analysis(req: CohortRequest, db: Session = Depends(get_db)):
    """Filters patients by clinical criteria and returns cohort-level statistics."""
    query = db.query(Patient)

    if req.age_min: query = query.filter(Patient.age >= req.age_min)
    if req.age_max: query = query.filter(Patient.age <= req.age_max)
    if req.tumor_grade: query = query.filter(Patient.tumor_grade == req.tumor_grade)
    if req.idh_mutation is not None: query = query.filter(Patient.idh_mutation == req.idh_mutation)
    if req.mgmt_methylation is not None: query = query.filter(Patient.mgmt_methylation == req.mgmt_methylation)

    patients = query.all()
    pids = [p.patient_id for p in patients]

    scans = db.query(Scan).filter(Scan.patient_id.in_(pids)).all()
    volumes = [s.tumor_volume_cc for s in scans if s.tumor_volume_cc]

    return {
        "cohort_size": len(patients),
        "filter_criteria": req.model_dump(exclude_none=True),
        "tumor_volume_stats": {
            "mean_cc": round(float(np.mean(volumes)), 2) if volumes else None,
            "median_cc": round(float(np.median(volumes)), 2) if volumes else None,
        },
        "patient_ids": pids[:50],  # cap at 50
    }
