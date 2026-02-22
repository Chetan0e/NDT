"""
Fusion Route — Multi-Modal Patient State Vector Generation
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from models.fusion import fusion_engine
from utils.vector_builders import (
    build_clinical_vector,
    build_genomic_vector,
    build_radiomics_vector,
)

router = APIRouter()


class FusionRequest(BaseModel):
    patient_id: Optional[str] = None
    radiomics: dict = {}          # Radiomics feature dict (key → float)
    clinical: dict = {}           # Patient clinical data
    genomic: dict = {}            # Genomic mutation flags


@router.post("/fusion", summary="Build Patient State Vector")
def fuse(req: FusionRequest):
    """
    Fuses imaging radiomics + clinical variables + genomic markers
    into a 64-dimensional Patient State Vector (PSV) using a 3-branch MLP.

    This vector is used for:
    - Digital twin initialization
    - Therapy simulation
    - Patient similarity search
    - Survival prediction
    """
    try:
        img_vec  = build_radiomics_vector(req.radiomics)
        clin_vec = build_clinical_vector(req.clinical)
        gen_vec  = build_genomic_vector(req.genomic)

        psv = fusion_engine.build_vector(img_vec, clin_vec, gen_vec)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fusion failed: {e}")

    return {
        "patient_id": req.patient_id,
        "vector_dim": len(psv),
        "patient_state_vector": psv,
        "inputs_used": {
            "radiomics_features": len([v for v in req.radiomics.values() if isinstance(v, (int, float))]),
            "clinical_fields": len(req.clinical),
            "genomic_markers": len(req.genomic),
        },
    }
