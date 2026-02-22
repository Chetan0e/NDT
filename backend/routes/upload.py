"""
Upload Route — MRI upload, segmentation, volume calculation, radiomics extraction
"""
import tempfile
import os
import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional

from utils.dicom_loader import load_dicom_series, load_nifti, get_voxel_spacing
from utils.volume import calculate_volume
from utils.radiomics_engine import radiomics_engine
from models.segmentor import segmentor

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/upload", summary="Upload MRI + Run Segmentation")
async def upload(
    files: list[UploadFile] = File(..., description="DICOM or NIfTI files"),
    patient_id: Optional[str] = Form(None),
    scan_date: Optional[str] = Form(None),
    extract_radiomics: bool = Form(False, description="Also run radiomics extraction"),
):
    """
    Full MRI processing pipeline:
    1. Load DICOM series or NIfTI
    2. Run 3D U-Net tumor segmentation
    3. Calculate tumor volume
    4. Optionally extract radiomics features
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    # Determine file type
    first_filename = files[0].filename.lower() if files[0].filename else ".dcm"

    try:
        if first_filename.endswith(".nii.gz") or first_filename.endswith(".nii"):
            # NIfTI upload — save to temp file
            content = await files[0].read()
            with tempfile.NamedTemporaryFile(
                suffix=".nii.gz", delete=False
            ) as tmp:
                tmp.write(content)
                tmp_path = tmp.name
            try:
                volume = load_nifti(tmp_path)
            finally:
                os.unlink(tmp_path)
            voxel_spacing = (1.0, 1.0, 1.0)

        else:
            # DICOM series
            voxel_spacing = get_voxel_spacing(files)
            for f in files:
                await f.seek(0)
            volume = load_dicom_series(files)

    except Exception as e:
        logger.error("Failed to load MRI files: %s", e)
        raise HTTPException(status_code=422, detail=f"Failed to parse MRI files: {e}")

    # ── Segmentation ─────────────────────────────────────────────────────
    try:
        seg_result = segmentor.predict_with_confidence(volume)
        mask = seg_result["mask"]
        confidence = seg_result["confidence"]
    except Exception as e:
        logger.error("Segmentation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Segmentation error: {e}")

    # ── Volume Calculation ────────────────────────────────────────────────
    vol_data = calculate_volume(mask, voxel_spacing)

    # ── Radiomics (optional) ──────────────────────────────────────────────
    radiomics_features = None
    if extract_radiomics:
        try:
            radiomics_features = radiomics_engine.extract(volume, mask)
        except Exception as e:
            logger.warning("Radiomics extraction failed: %s", e)
            radiomics_features = {"error": str(e)}

    response = {
        "status": "success",
        "patient_id": patient_id,
        "scan_date": scan_date,
        "volume": vol_data,
        "segmentation": {
            "confidence": confidence,
            "tumor_voxels": seg_result["tumor_voxels"],
        },
        "volume_mm3": vol_data["volume_mm3"],
        "volume_cc": vol_data["volume_cc"],
    }

    if radiomics_features:
        response["radiomics"] = radiomics_features

    return response
