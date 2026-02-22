"""
Growth Predictor — Tumor Volume Forecasting
Supports both linear regression (interpretable, clinical-first) and
exponential growth fitting for aggressive tumors.
"""
import numpy as np
from sklearn.linear_model import LinearRegression
from scipy.optimize import curve_fit
import logging

logger = logging.getLogger(__name__)


def _exponential(t, V0, r):
    """Exponential growth model: V = V0 * exp(r * t)"""
    return V0 * np.exp(r * t)


class GrowthPredictor:
    """
    Predicts future tumor volume from longitudinal scan history.

    Strategy:
    - 2 data points  → linear interpolation
    - ≥3 data points → linear regression + exponential fit (best of both)
    """

    def fit_predict(
        self,
        times: list[float],
        volumes: list[float],
        future_days: list[int] = None
    ) -> dict:
        """
        Args:
            times:       Day indices of scans, e.g. [0, 30, 60]
            volumes:     Tumor volumes at each time, e.g. [10, 15, 22]
            future_days: Days ahead to predict, default [30, 60, 90]

        Returns:
            dict with predictions, growth rate, R² and model used
        """
        if future_days is None:
            future_days = [30, 60, 90]

        t = np.array(times, dtype=float)
        v = np.array(volumes, dtype=float)

        if len(t) < 2:
            raise ValueError("Need at least 2 scans to predict growth.")

        # ─── Linear regression ────────────────────────────────────────────
        lin_model = LinearRegression()
        lin_model.fit(t.reshape(-1, 1), v)
        lin_predictions = {
            d: float(lin_model.predict([[t[-1] + d]])[0])
            for d in future_days
        }
        growth_rate_linear = float(lin_model.coef_[0])  # vol/day
        r2_linear = float(lin_model.score(t.reshape(-1, 1), v))

        # ─── Exponential regression (if ≥3 points) ───────────────────────
        exp_predictions = None
        r_exp = None
        r2_exp = None
        if len(t) >= 3:
            try:
                popt, _ = curve_fit(
                    _exponential, t - t[0], v, p0=[v[0], 0.01], maxfev=5000
                )
                V0_fit, r_fit = popt
                r_exp = float(r_fit)

                # R² for exponential
                v_pred = _exponential(t - t[0], *popt)
                ss_res = np.sum((v - v_pred) ** 2)
                ss_tot = np.sum((v - v.mean()) ** 2)
                r2_exp = float(1 - ss_res / ss_tot) if ss_tot != 0 else 0.0

                exp_predictions = {
                    d: float(_exponential(t[-1] - t[0] + d, *popt))
                    for d in future_days
                }
            except Exception as e:
                logger.warning("Exponential fit failed: %s", e)

        # ─── Choose best model ────────────────────────────────────────────
        if r2_exp is not None and r2_exp > r2_linear + 0.05:
            predictions = exp_predictions
            model_used = "exponential"
            r2 = r2_exp
        else:
            predictions = lin_predictions
            model_used = "linear"
            r2 = r2_linear

        # Clamp to 0 (tumor can't be negative)
        predictions = {k: max(0.0, v) for k, v in predictions.items()}

        return {
            "model_used": model_used,
            "growth_rate_per_day": growth_rate_linear,
            "exponential_rate": r_exp,
            "r_squared": round(r2, 4),
            "predictions": {f"day_{k}": round(v, 3) for k, v in predictions.items()},
            "current_volume": float(v[-1]),
            "trend": self._trend_label(growth_rate_linear),
        }

    @staticmethod
    def _trend_label(rate: float) -> str:
        if rate < 0:
            return "Shrinking"
        elif rate < 0.2:
            return "Stable"
        elif rate < 0.5:
            return "Slow growth"
        elif rate < 1.0:
            return "Moderate growth"
        else:
            return "Rapid growth"


# Singleton
predictor = GrowthPredictor()
