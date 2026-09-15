"""
Growth Parameter Estimation
Fits tumor growth curves to longitudinal scan data to extract
patient-specific parameters for the digital twin.
"""
import numpy as np
import warnings
from scipy.optimize import curve_fit, OptimizeWarning
import logging

logger = logging.getLogger(__name__)


def _logistic_growth(t, V0, alpha, K):
    """Logistic growth: V(t) = K / (1 + ((K - V0) / V0) * exp(-alpha * t))"""
    return K / (1 + ((K - V0) / (V0 + 1e-6)) * np.exp(-alpha * t))


def estimate_growth_params(
    times: list[float],
    volumes: list[float],
) -> dict:
    """
    Estimate α (growth rate) and K (carrying capacity) from scan data.

    Falls back to exponential estimate (simpler) if logistic fit fails.

    Returns:
        dict with keys: alpha, carrying_capacity, r_squared, method
    """
    t = np.array(times, dtype=float)
    v = np.array(volumes, dtype=float)

    # Normalize time to start at 0
    t = t - t[0]

    # ── Logistic fit (preferred, needs ≥3 points) ────────────────────────
    if len(t) >= 3:
        try:
            # Initial guess: current vol, slight growth, 10× current as K
            p0 = [v[0], 0.02, max(v) * 5]
            bounds = ([0, 0, max(v)], [np.inf, 1.0, np.inf])
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", OptimizeWarning)
                popt, _ = curve_fit(_logistic_growth, t, v, p0=p0, bounds=bounds, maxfev=10000)
            V0_fit, alpha_fit, K_fit = popt

            v_pred = _logistic_growth(t, *popt)
            ss_res = np.sum((v - v_pred) ** 2)
            ss_tot = np.sum((v - v.mean()) ** 2)
            r2 = float(1 - ss_res / ss_tot) if ss_tot > 0 else 0.0

            return {
                "alpha": float(max(alpha_fit, 0.001)),
                "carrying_capacity": float(K_fit),
                "r_squared": round(r2, 4),
                "method": "logistic",
            }
        except Exception as e:
            logger.debug("Logistic fit failed: %s — falling back to exponential", e)

    # ── Exponential fit (2+ points) ───────────────────────────────────────
    try:
        log_v = np.log(v + 1e-6)
        coeffs = np.polyfit(t, log_v, 1)
        alpha_exp = float(max(coeffs[0], 0.0001))

        log_v_pred = np.polyval(coeffs, t)
        ss_res = np.sum((log_v - log_v_pred) ** 2)
        ss_tot = np.sum((log_v - log_v.mean()) ** 2)
        r2 = float(1 - ss_res / ss_tot) if ss_tot > 0 else 0.0

        return {
            "alpha": alpha_exp,
            "carrying_capacity": float(max(v) * 10),  # rough estimate
            "r_squared": round(r2, 4),
            "method": "exponential",
        }
    except Exception as e:
        logger.warning("All growth fits failed: %s — using defaults", e)
        return {
            "alpha": 0.02,
            "carrying_capacity": 5000.0,
            "r_squared": 0.0,
            "method": "default",
        }


def estimate_alpha(times: list, volumes: list) -> float:
    """Convenience function — returns just the growth rate α."""
    return estimate_growth_params(times, volumes)["alpha"]
