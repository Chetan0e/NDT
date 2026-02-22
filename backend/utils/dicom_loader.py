"""
DICOM Loader — Parses DICOM series into 3D numpy volumes.
Handles sorting by InstanceNumber, normalization, and NIfTI fallback.
"""
import io
import numpy as np
import logging

logger = logging.getLogger(__name__)


def load_dicom_series(files) -> np.ndarray:
    """
    Load a list of UploadFile objects as a DICOM series.

    Args:
        files: List of FastAPI UploadFile objects (.dcm)

    Returns:
        3D numpy array (D, H, W), float32, normalized [0, 1]
    """
    import pydicom

    slices = []
    for f in files:
        raw = f.file.read()
        ds = pydicom.dcmread(io.BytesIO(raw))
        slices.append(ds)

    # Sort by InstanceNumber for correct slice ordering
    slices.sort(key=lambda s: getattr(s, "InstanceNumber", 0))

    # Stack pixel arrays
    volume = np.stack([s.pixel_array.astype(np.float32) for s in slices])

    # Normalize to [0, 1]
    v_min, v_max = volume.min(), volume.max()
    if v_max > v_min:
        volume = (volume - v_min) / (v_max - v_min)
    else:
        volume = np.zeros_like(volume)

    logger.info("Loaded DICOM volume: shape=%s, min=%.3f, max=%.3f",
                volume.shape, volume.min(), volume.max())
    return volume


def load_nifti(filepath: str) -> np.ndarray:
    """
    Load a NIfTI (.nii / .nii.gz) file as a 3D numpy array.

    Args:
        filepath: Path to the NIfTI file

    Returns:
        3D numpy array, float32, normalized [0, 1]
    """
    import nibabel as nib

    img = nib.load(filepath)
    data = img.get_fdata().astype(np.float32)

    v_min, v_max = data.min(), data.max()
    if v_max > v_min:
        data = (data - v_min) / (v_max - v_min)

    logger.info("Loaded NIfTI volume: shape=%s", data.shape)
    return data


def get_voxel_spacing(files) -> tuple[float, float, float]:
    """
    Extract voxel spacing (mm) from DICOM metadata.
    Returns (row_spacing, col_spacing, slice_thickness).
    """
    import pydicom
    import io

    raw = files[0].file.read()
    files[0].file.seek(0)  # reset for subsequent reads
    ds = pydicom.dcmread(io.BytesIO(raw))

    row_sp = col_sp = 1.0
    if hasattr(ds, "PixelSpacing"):
        row_sp, col_sp = float(ds.PixelSpacing[0]), float(ds.PixelSpacing[1])

    slice_thick = float(getattr(ds, "SliceThickness", 1.0))

    return row_sp, col_sp, slice_thick
