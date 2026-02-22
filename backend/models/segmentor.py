"""
3D U-Net Segmentor — Tumor Delineation Engine
Uses MONAI's pretrained 3D U-Net for brain tumor segmentation.
Falls back to mock segmentation when no weights are present (demo mode).
"""
import os
import logging
import numpy as np

import torch
from monai.networks.nets import UNet
from monai.transforms import (
    Compose, NormalizeIntensity, EnsureChannelFirst,
    Resize, ToTensor
)

from config import MODEL_PATH, DEVICE

logger = logging.getLogger(__name__)


class Segmentor:
    """
    3D U-Net segmentor for brain tumors.

    Channels: (16, 32, 64, 128, 256) → 4 encoder / decoder stages
    Input:  (B, 1, D, H, W)  — single-channel 3D MRI
    Output: (B, 1, D, H, W)  — tumor probability map
    """

    # Target spatial size for the model
    TARGET_SHAPE = (128, 128, 64)

    def __init__(self):
        self.device = torch.device(DEVICE)
        self.model = self._build_model()
        self._load_weights()
        self.model.eval()

        self.preprocess = Compose([
            EnsureChannelFirst(channel_dim="no_channel"),
            NormalizeIntensity(nonzero=True),
            Resize(spatial_size=self.TARGET_SHAPE),
            ToTensor(),
        ])

    def _build_model(self) -> UNet:
        return UNet(
            spatial_dims=3,
            in_channels=1,
            out_channels=2,          # background + tumor
            channels=(16, 32, 64, 128, 256),
            strides=(2, 2, 2, 2),
            num_res_units=2,
        ).to(self.device)

    def _load_weights(self):
        """Load pretrained weights if available; otherwise use random init (demo)."""
        if os.path.exists(MODEL_PATH):
            try:
                state = torch.load(MODEL_PATH, map_location=self.device)
                self.model.load_state_dict(state, strict=False)
                logger.info("✅ Segmentor weights loaded from %s", MODEL_PATH)
            except Exception as e:
                logger.warning("⚠️  Could not load weights: %s. Using demo mode.", e)
        else:
            logger.warning(
                "⚠️  Model weights not found at %s. Running in DEMO mode "
                "(random segmentation). Run models/download_weights.py to fetch "
                "pretrained weights.", MODEL_PATH
            )

    def predict(self, volume: np.ndarray) -> np.ndarray:
        """
        Segment tumor from a 3D MRI volume.

        Args:
            volume: numpy array of shape (D, H, W), float32, [0-1]

        Returns:
            Binary mask of shape (D, H, W), uint8
        """
        with torch.no_grad():
            # Pre-process
            tensor = self.preprocess(volume)             # (1, D, H, W)
            tensor = tensor.unsqueeze(0).to(self.device) # (1, 1, D, H, W)

            # Forward pass
            logits = self.model(tensor)                  # (1, 2, D, H, W)
            probs = torch.softmax(logits, dim=1)
            tumor_prob = probs[0, 1]                     # (D, H, W)

            # Threshold at 0.5
            mask = (tumor_prob > 0.5).cpu().numpy().astype(np.uint8)

        return mask

    def predict_with_confidence(self, volume: np.ndarray) -> dict:
        """Returns mask + average confidence score."""
        with torch.no_grad():
            tensor = self.preprocess(volume).unsqueeze(0).to(self.device)
            logits = self.model(tensor)
            probs = torch.softmax(logits, dim=1)
            tumor_prob = probs[0, 1].cpu().numpy()

        mask = (tumor_prob > 0.5).astype(np.uint8)
        confidence = float(tumor_prob[mask == 1].mean()) if mask.sum() > 0 else 0.0

        return {
            "mask": mask,
            "confidence": round(confidence, 4),
            "tumor_voxels": int(mask.sum()),
        }


# Singleton instance
segmentor = Segmentor()
