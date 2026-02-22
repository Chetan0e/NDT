"""
BraTS Dataset Loader
Loads the BraTS (Brain Tumor Segmentation) dataset for training.
Supports BraTS 2020/2021/2023 directory structure.

Directory structure expected:
    <root>/
        BraTS2021_00000/
            BraTS2021_00000_flair.nii.gz
            BraTS2021_00000_t1.nii.gz
            BraTS2021_00000_t1ce.nii.gz
            BraTS2021_00000_t2.nii.gz
            BraTS2021_00000_seg.nii.gz
"""
import os
import numpy as np
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# BraTS modalities
MODALITIES = ["flair", "t1", "t1ce", "t2"]


class BraTSLoader:
    """Loads BraTS MRI data for model training and validation."""

    def __init__(self, root: str):
        self.root = Path(root)
        if not self.root.exists():
            raise FileNotFoundError(f"BraTS root not found: {root}")

        self.patients = sorted([
            d.name for d in self.root.iterdir()
            if d.is_dir() and not d.name.startswith(".")
        ])
        logger.info("BraTSLoader: found %d patients in %s", len(self.patients), root)

    def __len__(self):
        return len(self.patients)

    def load_patient(
        self,
        pid: str,
        modalities: list[str] = None,
        normalize: bool = True,
    ) -> np.ndarray:
        """
        Load multi-modal MRI volume for a patient.

        Args:
            pid:        Patient ID string
            modalities: Subset of ["flair", "t1", "t1ce", "t2"]
            normalize:  Normalize each modality independently to [0, 1]

        Returns:
            numpy array of shape (C, D, H, W), float32
        """
        import nibabel as nib

        mods = modalities or MODALITIES
        path = self.root / pid
        channels = []

        for mod in mods:
            # Support both old (BRATS_pid_mod.nii.gz) and new naming
            for pattern in [
                f"{pid}_{mod}.nii.gz",
                f"{pid}-{mod}.nii.gz",
                f"{mod}.nii.gz",
            ]:
                fpath = path / pattern
                if fpath.exists():
                    vol = nib.load(str(fpath)).get_fdata().astype(np.float32)
                    if normalize:
                        v_min, v_max = vol.min(), vol.max()
                        vol = (vol - v_min) / (v_max - v_min + 1e-6)
                    channels.append(vol)
                    break
            else:
                logger.warning("Modality %s not found for patient %s", mod, pid)

        if not channels:
            raise FileNotFoundError(f"No modality files found for patient {pid}")

        return np.stack(channels)  # (C, D, H, W)

    def load_mask(self, pid: str) -> Optional[np.ndarray]:
        """Load ground-truth segmentation mask."""
        import nibabel as nib

        path = self.root / pid
        for pattern in [f"{pid}_seg.nii.gz", "seg.nii.gz"]:
            fpath = path / pattern
            if fpath.exists():
                return nib.load(str(fpath)).get_fdata().astype(np.uint8)

        logger.warning("Segmentation mask not found for patient %s", pid)
        return None

    def load_pair(self, pid: str) -> tuple[np.ndarray, Optional[np.ndarray]]:
        """Load (volume, mask) pair for a patient."""
        volume = self.load_patient(pid)
        mask = self.load_mask(pid)
        return volume, mask

    def get_split(self, val_ratio: float = 0.2) -> tuple[list, list]:
        """Split patients into train / validation sets."""
        n_val = max(1, int(len(self.patients) * val_ratio))
        return self.patients[n_val:], self.patients[:n_val]


class BraTSTorchDataset:
    """
    PyTorch Dataset wrapper for BraTS data.
    Use with DataLoader for training the segmentor.
    """

    def __init__(self, loader: BraTSLoader, patient_ids: list[str]):
        import torch
        self.loader = loader
        self.patients = patient_ids
        self.torch = torch

    def __len__(self):
        return len(self.patients)

    def __getitem__(self, idx: int):
        pid = self.patients[idx]
        volume, mask = self.loader.load_pair(pid)

        x = self.torch.tensor(volume, dtype=self.torch.float32)
        y = self.torch.tensor(mask, dtype=self.torch.long) if mask is not None \
            else self.torch.zeros(volume.shape[1:], dtype=self.torch.long)

        return x, y
