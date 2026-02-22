"""
Twin Route — Digital Twin Simulation Endpoint
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
from typing import Optional
from models.twin_builder import builder
from utils.clinical_interpretation import risk_stratify, interpret_response
from utils.fit_growth import estimate_growth_params

router = APIRouter()


class SimulateRequest(BaseModel):
    patient_id: Optional[str] = None
    times: list[float]        # Historical scan days
    volumes: list[float]      # Historical tumor volumes
    days: int = 60            # Simulation horizon
    therapy: float = 0.0     # Constant therapy intensity 0–3
    therapy_schedule: Optional[list[float]] = None  # Per-day schedule (overrides therapy)
    patient_sensitivity: float = 1.0  # Multiplier for β from genomics

    @field_validator("therapy")
    @classmethod
    def clamp_therapy(cls, v):
        return max(0.0, min(3.0, v))


@router.post("/simulate", summary="Run Digital Twin Simulation")
def simulate(req: SimulateRequest):
    """
    Build a patient-specific digital twin and simulate tumor growth over time.

    Returns a day-by-day trajectory curve and clinical interpretation.
    Supports therapy scheduling for treatment planning.
    """
    if len(req.times) < 2:
        raise HTTPException(status_code=400, detail="At least 2 historical scans required.")

    if req.therapy_schedule and len(req.therapy_schedule) != req.days:
        raise HTTPException(
            status_code=400,
            detail=f"therapy_schedule must have {req.days} entries."
        )

    try:
        twin = builder.build(req.times, req.volumes, req.patient_sensitivity)
        result = twin.simulate(
            V0=req.volumes[-1],
            days=req.days,
            T=req.therapy,
            therapy_schedule=req.therapy_schedule,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Growth parameters for risk context
    params = estimate_growth_params(req.times, req.volumes)
    risk = risk_stratify(params["alpha"], req.volumes[-1] / 1000.0)

    return {
        "patient_id": req.patient_id,
        "simulation": {
            "days": result.days,
            "trajectory": result.trajectory,
            "initial_volume": result.initial_volume,
            "final_volume": result.final_volume,
            "peak_volume": result.peak_volume,
            "volume_change_pct": result.volume_change_pct,
            "growth_label": result.growth_label,
        },
        "growth_parameters": {
            "alpha": round(params["alpha"], 5),
            "carrying_capacity": round(params["carrying_capacity"], 2),
            "method": params["method"],
            "r_squared": params["r_squared"],
        },
        "therapy_used": req.therapy,
        "clinical_assessment": {
            **risk,
            "response_label": interpret_response(result.volume_change_pct),
        },
    }


@router.post("/compare-therapies", summary="Compare All Therapy Strategies")
def compare_therapies(req: SimulateRequest):
    """
    Simulate tumor growth under all 4 therapy levels and return a comparison.
    """
    if len(req.times) < 2:
        raise HTTPException(status_code=400, detail="At least 2 historical scans required.")

    try:
        twin = builder.build(req.times, req.volumes, req.patient_sensitivity)
        comparison = twin.compare_therapies(req.volumes[-1], req.days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "patient_id": req.patient_id,
        "simulation_days": req.days,
        "initial_volume": req.volumes[-1],
        "therapy_comparison": comparison,
    }
