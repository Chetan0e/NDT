"""
Predict Route — Tumor Growth Prediction from Longitudinal Scan History
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, model_validator
from models.predictor import predictor

router = APIRouter()


class PredictRequest(BaseModel):
    times: list[float]        # Days from baseline, e.g. [0, 30, 60]
    volumes: list[float]      # Tumor volumes at each time
    future_days: list[int] = [30, 60, 90]
    patient_id: str | None = None

    @model_validator(mode="after")
    def validate_points(self):
        if len(self.times) == len(self.volumes) and len(self.times) < 2:
            raise ValueError("At least 2 data points required.")
        return self


@router.post("/predict", summary="Predict Tumor Growth")
def predict(req: PredictRequest):
    """
    Predict future tumor volumes using linear and/or exponential regression.
    Returns predictions at 30, 60, 90 days (or custom days).
    """
    if len(req.times) != len(req.volumes):
        raise HTTPException(
            status_code=400,
            detail="times and volumes must have the same length."
        )

    try:
        result = predictor.fit_predict(
            times=req.times,
            volumes=req.volumes,
            future_days=req.future_days,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "patient_id": req.patient_id,
        "input_scans": len(req.times),
        **result,
    }
