"""
Reinforcement Learning Therapy Optimizer
Uses a Gymnasium environment wrapping the TumorTwin ODE simulator.
The RL agent learns to select therapy intensities that minimize tumor volume
while balancing treatment toxicity.

Architecture:
  - Environment: TumorGrowthEnv (custom Gymnasium env)
  - Agent: PPO (stable-baselines3) — proven for continuous control tasks
  - Reward: negative final volume + toxicity penalty
"""
import numpy as np
import gymnasium as gym
from gymnasium import spaces
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Gymnasium Environment
# ─────────────────────────────────────────────────────────────────────────────

class TumorGrowthEnv(gym.Env):
    """
    Custom Gymnasium environment simulating tumor response to therapy.

    State:  [current_volume (normalized), day (normalized), cumulative_toxicity]
    Action: therapy intensity ∈ [0, 3]  (continuous)
    Reward: -Δvolume - toxicity_penalty
    """

    metadata = {"render_modes": []}

    def __init__(
        self,
        initial_volume: float = 30.0,
        max_days: int = 60,
        alpha: float = 0.02,
        K: float = 500.0,
        beta: float = 0.015,
        toxicity_weight: float = 0.3,
    ):
        super().__init__()

        self.initial_volume = initial_volume
        self.max_days = max_days
        self.alpha = alpha
        self.K = K
        self.beta = beta
        self.toxicity_weight = toxicity_weight

        # Observation: [normalized_volume, normalized_day, cumulative_toxicity]
        self.observation_space = spaces.Box(
            low=np.array([0.0, 0.0, 0.0], dtype=np.float32),
            high=np.array([1.0, 1.0, 1.0], dtype=np.float32),
        )

        # Action: continuous therapy intensity [0, 3]
        self.action_space = spaces.Box(
            low=np.array([0.0], dtype=np.float32),
            high=np.array([3.0], dtype=np.float32),
        )

        self._reset_state()

    def _reset_state(self):
        self.volume = self.initial_volume
        self.day = 0
        self.cumulative_toxicity = 0.0
        self.trajectory = [self.initial_volume]

    def _obs(self) -> np.ndarray:
        return np.array([
            np.clip(self.volume / self.K, 0, 1),
            self.day / self.max_days,
            np.clip(self.cumulative_toxicity / (self.max_days * 3), 0, 1),
        ], dtype=np.float32)

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        self._reset_state()
        return self._obs(), {}

    def step(self, action: np.ndarray):
        T = float(np.clip(action[0], 0, 3))

        # ODE step (proportional log-kill)
        dV = (self.alpha * (1.0 - (self.volume / self.K)) - self.beta * T) * self.volume
        self.volume = max(self.volume + dV, 0.0)
        self.day += 1
        self.trajectory.append(self.volume)
        self.cumulative_toxicity += T

        # Reward: encourage volume reduction, penalize toxicity
        reward = float(-dV - self.toxicity_weight * T)

        terminated = self.day >= self.max_days or self.volume <= 0
        return self._obs(), reward, terminated, False, {}

    def render(self):
        pass


# ─────────────────────────────────────────────────────────────────────────────
# RL Agent (rule-based fallback when SB3 not available)
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class TherapyRecommendation:
    best_therapy: str
    therapy_intensity: float
    final_volume: float
    volume_reduction_pct: float
    strategy_comparison: dict
    explanation: str


class RLTherapyOptimizer:
    """
    Reinforcement Learning based therapy optimizer.

    In demo / no-GPU mode: uses rule-based heuristic (simulates all therapy
    levels and picks the one minimizing final volume within toxicity budget).

    Full mode: train PPO agent using stable-baselines3 for N episodes.
    """

    THERAPY_MAP = {
        0.0: "No Treatment (Watch & Wait)",
        1.0: "Mild Chemotherapy (Temozolomide low-dose)",
        2.0: "Standard Chemo + Radiotherapy",
        3.0: "Aggressive Multi-modal Therapy",
    }

    def __init__(self):
        self._sb3_available = self._check_sb3()

    @staticmethod
    def _check_sb3() -> bool:
        try:
            import stable_baselines3  # noqa
            return True
        except ImportError:
            logger.warning("stable-baselines3 not installed — using heuristic optimizer.")
            return False

    # ── Heuristic optimizer (always available) ─────────────────────────────

    def optimize_heuristic(
        self,
        initial_volume: float,
        alpha: float,
        K: float,
        beta: float,
        days: int = 60,
        toxicity_budget: float = 2.0,
        **kwargs,
    ) -> TherapyRecommendation:
        """Try all discrete therapy levels; pick best within toxicity budget."""

        results = {}
        for intensity, label in self.THERAPY_MAP.items():
            if intensity > toxicity_budget:
                continue

            vol = initial_volume
            for _ in range(days):
                dV = (alpha * (1.0 - (vol / K)) - beta * intensity) * vol
                vol = max(vol + dV, 0.0)

            reduction = (initial_volume - vol) / initial_volume * 100 if initial_volume > 0 else 0
            results[label] = {
                "intensity": intensity,
                "final_volume": round(vol, 3),
                "volume_reduction_pct": round(reduction, 2),
            }

        # Pick best by lowest final volume
        best_label = min(results, key=lambda k: results[k]["final_volume"])
        best = results[best_label]

        explanation = self._explain(best["intensity"], best["volume_reduction_pct"])

        return TherapyRecommendation(
            best_therapy=best_label,
            therapy_intensity=best["intensity"],
            final_volume=best["final_volume"],
            volume_reduction_pct=best["volume_reduction_pct"],
            strategy_comparison=results,
            explanation=explanation,
        )

    # ── PPO-based optimizer (requires stable-baselines3) ──────────────────

    def optimize_ppo(
        self,
        initial_volume: float,
        alpha: float,
        K: float,
        beta: float,
        days: int = 60,
        train_steps: int = 10_000,
        toxicity_budget: float = 2.0,
        **kwargs,
    ) -> TherapyRecommendation:
        """Train a PPO agent on the patient's tumor twin environment."""
        if not self._sb3_available:
            return self.optimize_heuristic(initial_volume, alpha, K, beta, days, toxicity_budget=toxicity_budget, **kwargs)

        from stable_baselines3 import PPO
        from stable_baselines3.common.env_checker import check_env

        env = TumorGrowthEnv(initial_volume, days, alpha, K, beta)
        check_env(env)

        model = PPO("MlpPolicy", env, verbose=0, n_steps=256, batch_size=64)
        model.learn(total_timesteps=train_steps)

        # Evaluate learned policy
        obs, _ = env.reset()
        done = False
        while not done:
            action, _ = model.predict(obs, deterministic=True)
            obs, _, term, trunc, _ = env.step(action)
            done = term or trunc

        final_vol = env.volume
        avg_intensity = env.cumulative_toxicity / days
        reduction = (initial_volume - final_vol) / initial_volume * 100

        # Label best therapy
        best_label = min(
            self.THERAPY_MAP,
            key=lambda x: abs(x - avg_intensity)
        )

        return TherapyRecommendation(
            best_therapy=self.THERAPY_MAP[best_label],
            therapy_intensity=round(avg_intensity, 3),
            final_volume=round(final_vol, 3),
            volume_reduction_pct=round(reduction, 2),
            strategy_comparison={},
            explanation=self._explain(avg_intensity, reduction),
        )

    def optimize(self, initial_volume, alpha, K, beta, days=60, use_rl=False, **kwargs):
        """Entry point: use PPO if use_rl=True, else heuristic."""
        if use_rl and self._sb3_available:
            return self.optimize_ppo(initial_volume, alpha, K, beta, days, **kwargs)
        return self.optimize_heuristic(initial_volume, alpha, K, beta, days, **kwargs)

    @staticmethod
    def _explain(intensity: float, reduction_pct: float) -> str:
        lines = []
        if reduction_pct > 40:
            lines.append("Excellent response predicted — strong tumor control.")
        elif reduction_pct > 10:
            lines.append("Good response — meaningful tumor reduction expected.")
        elif reduction_pct > 0:
            lines.append("Modest benefit — disease stabilization likely.")
        else:
            lines.append("Tumor may continue to grow with this strategy.")

        if intensity >= 3.0:
            lines.append("⚠️ High-intensity regimen — monitor toxicity carefully.")
        elif intensity >= 2.0:
            lines.append("Standard chemo-radiation is the clinical baseline.")
        elif intensity >= 1.0:
            lines.append("Low-intensity approach suitable for frail patients.")
        else:
            lines.append("Active surveillance recommended for indolent tumors.")

        return " ".join(lines)


# Singleton
rl_optimizer = RLTherapyOptimizer()
