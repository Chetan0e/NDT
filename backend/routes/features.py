"""
Features Route — Radiomics Feature Interpretation
"""
from fastapi import APIRouter
from pydantic import BaseModel
from utils.feature_labels import interpret_features

router = APIRouter()


class InterpretRequest(BaseModel):
    features: dict[str, float]


@router.post("/interpret", summary="Interpret Radiomics Features")
def interpret(req: InterpretRequest):
    """
    Translates raw radiomics keys into clinician-readable feature labels with notes.
    """
    interpreted = interpret_features(req.features)
    return {
        "feature_count": len(interpreted),
        "interpreted_features": interpreted,
    }
