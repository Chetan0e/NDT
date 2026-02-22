"""
Multi-Modal Fusion Engine
Combines imaging radiomics, clinical variables, and genomic markers
into a unified Patient State Vector (PSV) used by the digital twin.
"""
import torch
import torch.nn as nn
import numpy as np
import logging

logger = logging.getLogger(__name__)


class FusionModel(nn.Module):
    """
    3-branch neural network that encodes:
      - Imaging branch: radiomics feature vector
      - Clinical branch: age, KPS, grade, treatments
      - Genomic branch: mutation status vector

    Output: 64-dim patient state vector
    """

    def __init__(
        self,
        img_dim: int = 100,
        clin_dim: int = 10,
        gen_dim: int = 10,
        hidden: int = 128,
        out_dim: int = 64,
    ):
        super().__init__()

        def branch(in_dim):
            return nn.Sequential(
                nn.Linear(in_dim, hidden),
                nn.ReLU(),
                nn.LayerNorm(hidden),
                nn.Dropout(0.1),
                nn.Linear(hidden, hidden // 2),
                nn.ReLU(),
            )

        self.img_branch   = branch(img_dim)
        self.clin_branch  = branch(clin_dim)
        self.gen_branch   = branch(gen_dim)

        self.fusion = nn.Sequential(
            nn.Linear((hidden // 2) * 3, hidden),
            nn.ReLU(),
            nn.LayerNorm(hidden),
            nn.Linear(hidden, out_dim),
        )

    def forward(
        self,
        img: torch.Tensor,
        clin: torch.Tensor,
        gen: torch.Tensor,
    ) -> torch.Tensor:
        i = self.img_branch(img)
        c = self.clin_branch(clin)
        g = self.gen_branch(gen)
        x = torch.cat([i, c, g], dim=-1)
        return self.fusion(x)


class FusionEngine:
    """
    Wraps FusionModel with padding logic so callers can pass
    variable-length feature vectors.
    """

    IMG_DIM  = 100
    CLIN_DIM = 10
    GEN_DIM  = 10

    def __init__(self):
        self.model = FusionModel(
            img_dim=self.IMG_DIM,
            clin_dim=self.CLIN_DIM,
            gen_dim=self.GEN_DIM,
        )
        self.model.eval()

    def _pad(self, vec: list, target: int) -> list:
        """Pad or truncate vector to target length."""
        vec = list(vec)
        if len(vec) >= target:
            return vec[:target]
        return vec + [0.0] * (target - len(vec))

    @torch.no_grad()
    def build_vector(
        self,
        img_features: list,
        clinical_features: list,
        genomic_features: list,
    ) -> list:
        """
        Build a 64-dim patient state vector.

        Args:
            img_features:      Radiomics feature list (any length ≤ IMG_DIM)
            clinical_features: Clinical variable list (any length ≤ CLIN_DIM)
            genomic_features:  Genomic mutation list (any length ≤ GEN_DIM)

        Returns:
            List of 64 floats forming the Patient State Vector
        """
        img  = torch.tensor(self._pad(img_features,      self.IMG_DIM),  dtype=torch.float32).unsqueeze(0)
        clin = torch.tensor(self._pad(clinical_features, self.CLIN_DIM), dtype=torch.float32).unsqueeze(0)
        gen  = torch.tensor(self._pad(genomic_features,  self.GEN_DIM),  dtype=torch.float32).unsqueeze(0)

        vec = self.model(img, clin, gen)
        return vec.squeeze(0).tolist()


# Singleton
fusion_engine = FusionEngine()
