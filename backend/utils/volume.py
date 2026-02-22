"""
Volume Calculator — Converts segmentation masks to physical volumes.
Supports mm³ and cc (mL) units.
"""
import numpy as np


def calculate_volume(
    mask: np.ndarray,
    voxel_spacing: tuple[float, float, float] = (1.0, 1.0, 1.0),
) -> dict:
    """
    Calculate tumor volume from a binary segmentation mask.

    Args:
        mask:          Binary mask array (D, H, W), uint8
        voxel_spacing: (row_mm, col_mm, slice_mm) voxel dimensions

    Returns:
        dict with volume in mm³, cc, and voxel count
    """
    row_mm, col_mm, slice_mm = voxel_spacing
    voxel_vol_mm3 = row_mm * col_mm * slice_mm

    tumor_voxels = int(np.sum(mask))
    volume_mm3 = float(tumor_voxels * voxel_vol_mm3)
    volume_cc = volume_mm3 / 1000.0  # 1 cc = 1000 mm³

    return {
        "tumor_voxels": tumor_voxels,
        "volume_mm3": round(volume_mm3, 3),
        "volume_cc": round(volume_cc, 4),
        "voxel_size_mm3": round(voxel_vol_mm3, 4),
    }


def calculate_subregion_volumes(
    mask: np.ndarray,
    voxel_spacing: tuple[float, float, float] = (1.0, 1.0, 1.0),
) -> dict:
    """
    For multi-label BraTS segmentation masks:
      Label 1 = Necrotic core
      Label 2 = Edema
      Label 4 = Enhancing tumor
    """
    row_mm, col_mm, slice_mm = voxel_spacing
    voxel_vol_mm3 = row_mm * col_mm * slice_mm

    results = {}
    label_map = {
        1: "necrotic_core",
        2: "peritumoral_edema",
        4: "enhancing_tumor",
    }

    whole_tumor_voxels = 0

    for label, name in label_map.items():
        count = int(np.sum(mask == label))
        vol_mm3 = count * voxel_vol_mm3
        results[name] = {
            "voxels": count,
            "volume_mm3": round(vol_mm3, 3),
            "volume_cc": round(vol_mm3 / 1000.0, 4),
        }
        whole_tumor_voxels += count

    results["whole_tumor"] = {
        "voxels": whole_tumor_voxels,
        "volume_mm3": round(whole_tumor_voxels * voxel_vol_mm3, 3),
        "volume_cc": round(whole_tumor_voxels * voxel_vol_mm3 / 1000.0, 4),
    }

    return results
