"""
routes/seed.py — Cohort Seeding and Synthetic MRI Demonstration Data
"""
import logging
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from seed_data import seed_database

logger = logging.getLogger(__name__)
router = APIRouter()


class SeedRequest(BaseModel):
    force: bool = False


@router.post("/seed", summary="Seed or Reset Demo Clinical Cohort")
def seed_cohort(req: SeedRequest = SeedRequest(), db: Session = Depends(get_db)):
    """
    Populates the database with 5 diverse, realistic neuro-oncology cases
    with longitudinal MRI scans, radiomics, molecular biomarkers, and treatment simulations.
    Set force=true to purge existing data and reseed.
    """
    result = seed_database(db, force=req.force)
    return result


@router.post("/sample/mri", summary="Generate/Retrieve Synthetic MRI Sample Result")
def get_sample_mri():
    """
    Returns a realistic 3D volumetric MRI segmentation & radiomics result.
    Useful for one-click testing of the upload, segmentation, 3D viewer,
    and radiomics pipeline without needing to upload large DICOM/NIfTI files.
    """
    return {
        "status": "success",
        "sample_mode": True,
        "patient_id": "NDT-001",
        "scan_date": "2026-01-15",
        "filename": "synthetic_brain_t1c_sample.nii.gz",
        "volume": {
            "volume_mm3": 34850.0,
            "volume_cc": 34.85,
            "voxel_count": 34850,
            "voxel_spacing": [1.0, 1.0, 1.0],
            "subregions": {
                "enhancing_tumor_cc": 24.2,
                "necrotic_core_cc": 6.8,
                "peritumoral_edema_cc": 19.4,
            },
        },
        "segmentation": {
            "confidence": 0.942,
            "tumor_voxels": 34850,
            "dice_score": 0.91,
            "subregions": {
                "enhancing": 24200,
                "necrotic": 6800,
                "edema": 19400,
            },
        },
        "volume_mm3": 34850.0,
        "volume_cc": 34.85,
        "radiomics": {
            "firstorder_Entropy": 6.92,
            "firstorder_Mean": 0.63,
            "firstorder_Energy": 86400.0,
            "firstorder_Skewness": 0.49,
            "firstorder_Kurtosis": 3.18,
            "shape_Sphericity": 0.41,
            "shape_SurfaceVolumeRatio": 0.79,
            "shape_Elongation": 0.62,
            "glcm_Contrast": 292.0,
            "glcm_Homogeneity": 0.30,
            "glcm_Correlation": 0.44,
            "risk_score": 8.6,
        },
        "psv_dimension": 64,
        "times": [0, 30, 60],
        "volumes": [23.4, 28.6, 34.85],
        "scanHistory": [
            {"date": "2025-11-15", "volume": 23.4},
            {"date": "2025-12-15", "volume": 28.6},
            {"date": "2026-01-15", "volume": 34.85},
        ],
    }
