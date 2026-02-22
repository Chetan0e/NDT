"""
Twin Builder — Patient-Specific Digital Twin Factory
Estimates patient-specific growth parameters from scan history
and instantiates a calibrated TumorTwin instance.
"""
import numpy as np
from models.twin import TumorTwin
from utils.fit_growth import estimate_growth_params
import logging

logger = logging.getLogger(__name__)


class TwinBuilder:
    """Creates personalized digital twins calibrated to patient scan data."""

    # Default carrying capacity (mm³) if not enough data to estimate
    DEFAULT_K = 5000.0
    DEFAULT_BETA = 0.02

    def build(
        self,
        times: list[float],
        volumes: list[float],
        patient_sensitivity: float = 1.0,
    ) -> TumorTwin:
        """
        Build a patient-specific TumorTwin.

        Args:
            times:               Scan days (e.g. [0, 30, 60])
            volumes:             Tumor volumes at each scan
            patient_sensitivity: Multiplier for treatment sensitivity (from genomics)

        Returns:
            Calibrated TumorTwin instance
        """
        if len(times) < 2:
            logger.warning("Insufficient scan data — using default parameters.")
            return TumorTwin(alpha=0.02, K=self.DEFAULT_K, beta=self.DEFAULT_BETA)

        params = estimate_growth_params(times, volumes)
        alpha = params["alpha"]
        K = params.get("carrying_capacity", self.DEFAULT_K)
        beta = self.DEFAULT_BETA * patient_sensitivity

        logger.info(
            "🧬 Patient twin built — α=%.4f  K=%.1f  β=%.4f",
            alpha, K, beta
        )

        return TumorTwin(alpha=alpha, K=K, beta=beta)


# Singleton factory
builder = TwinBuilder()
