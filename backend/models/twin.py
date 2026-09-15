"""
Digital Twin — Tumor Growth ODE Simulator
Models tumor volume dynamics using a logistic growth equation with therapy:

    dV/dt = α · V · (1 − V/K) − β · T · V

Where:
    V = tumor volume (mm³ or cc)
    α = intrinsic growth rate (patient-specific)
    K = carrying capacity
    β = treatment sensitivity
    T = therapy intensity (0–3)
"""
import numpy as np
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class SimulationResult:
    trajectory: list[float]
    days: list[int]
    initial_volume: float
    final_volume: float
    peak_volume: float
    volume_change_pct: float
    growth_label: str


class TumorTwin:
    """
    Patient-specific digital twin using a logistic ODE with therapy dampening.

    Therapy intensity scale:
        0.0 = no treatment
        1.0 = mild chemotherapy
        2.0 = standard chemo + radiation
        3.0 = aggressive multi-modal therapy
    """

    THERAPY_LABELS = {
        0.0: "No Treatment",
        1.0: "Mild Chemotherapy",
        2.0: "Standard Chemo + RT",
        3.0: "Aggressive Multi-modal",
    }

    def __init__(
        self,
        alpha: float = 0.02,
        K: float = 500.0,
        beta: float = 0.015,
        noise_std: float = 0.0,
    ):
        """
        Args:
            alpha: Growth rate (day⁻¹)
            K:     Carrying capacity (same unit as volume)
            beta:  Treatment sensitivity
            noise_std: Biological noise (0 = deterministic)
        """
        self.alpha = alpha
        self.K = K
        self.beta = beta
        self.noise_std = noise_std

    def simulate(
        self,
        V0: float,
        days: int,
        T: float = 0.0,
        therapy_schedule: Optional[list[float]] = None,
    ) -> SimulationResult:
        """
        Run the tumor simulation.

        Args:
            V0:               Initial volume
            days:             Number of days to simulate
            T:                Constant therapy intensity (ignored if therapy_schedule given)
            therapy_schedule: Per-day therapy intensity list (length = days)

        Returns:
            SimulationResult dataclass
        """
        if therapy_schedule and len(therapy_schedule) != days:
            raise ValueError("therapy_schedule length must equal days")

        V = float(V0)
        trajectory = [V]

        for d in range(days):
            intensity = therapy_schedule[d] if therapy_schedule else T

            # Logistic growth with therapy (fractional log-kill model)
            dV = (self.alpha * (1.0 - (V / self.K)) - self.beta * intensity) * V

            # Optional biological noise (Gaussian)
            if self.noise_std > 0:
                dV += np.random.normal(0, self.noise_std * abs(dV + 1e-6))

            V = max(V + dV, 0.0)  # volume can't go negative
            trajectory.append(round(V, 4))

        final_vol = trajectory[-1]
        peak_vol = max(trajectory)
        change_pct = ((final_vol - V0) / V0 * 100) if V0 > 0 else 0.0

        return SimulationResult(
            trajectory=trajectory,
            days=list(range(days + 1)),
            initial_volume=round(V0, 4),
            final_volume=round(final_vol, 4),
            peak_volume=round(peak_vol, 4),
            volume_change_pct=round(change_pct, 2),
            growth_label=self._growth_label(change_pct),
        )

    @staticmethod
    def _growth_label(change_pct: float) -> str:
        if change_pct < -20:
            return "Significant regression"
        elif change_pct < 0:
            return "Mild regression"
        elif change_pct < 10:
            return "Stable disease"
        elif change_pct < 30:
            return "Slow progression"
        elif change_pct < 60:
            return "Moderate progression"
        else:
            return "Rapid progression"

    def compare_therapies(self, V0: float, days: int) -> dict:
        """Compare all therapy levels; useful for RL training reward shaping."""
        results = {}
        for level in [0.0, 1.0, 2.0, 3.0]:
            sim = self.simulate(V0, days, T=level)
            results[self.THERAPY_LABELS[level]] = {
                "final_volume": sim.final_volume,
                "volume_change_pct": sim.volume_change_pct,
                "therapy_intensity": level,
            }
        return results
