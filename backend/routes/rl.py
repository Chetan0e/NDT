"""
RL Route — Reinforcement Learning Therapy Optimizer Endpoint
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from models.rl_agent import rl_optimizer
from utils.fit_growth import estimate_growth_params

router = APIRouter()


class OptimizeRequest(BaseModel):
    patient_id: Optional[str] = None
    times: list[float]            # Historical scan days
    volumes: list[float]          # Historical tumor volumes
    days: int = 60                # Optimization horizon
    toxicity_budget: float = 2.0  # Max allowed therapy intensity
    use_rl: bool = False          # True = PPO agent, False = heuristic
    rl_steps: int = 5000          # RL training steps (ignored if use_rl=False)


@router.post("/optimize", summary="RL Therapy Optimization")
def optimize(req: OptimizeRequest):
    """
    Optimize therapy strategy using either:
    - Heuristic: brute-force simulation of all therapy levels (fast, interpretable)
    - PPO RL agent: trained on the patient's digital twin environment (slower, adaptive)

    Returns the best therapy recommendation with clinical explanation.
    """
    if len(req.times) < 2:
        raise HTTPException(
            status_code=400, detail="At least 2 historical scans required."
        )

    # Estimate growth parameters
    try:
        params = estimate_growth_params(req.times, req.volumes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Growth param estimation failed: {e}")

    alpha = params["alpha"]
    K = params["carrying_capacity"]
    beta = 0.015  # baseline treatment sensitivity

    try:
        rec = rl_optimizer.optimize(
            initial_volume=req.volumes[-1],
            alpha=alpha,
            K=K,
            beta=beta,
            days=req.days,
            use_rl=req.use_rl,
            toxicity_budget=req.toxicity_budget,
            train_steps=req.rl_steps,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {e}")

    return {
        "patient_id": req.patient_id,
        "optimization_method": "ppo" if req.use_rl else "heuristic",
        "recommendation": {
            "best_therapy": rec.best_therapy,
            "therapy_intensity": rec.therapy_intensity,
            "final_volume": rec.final_volume,
            "volume_reduction_pct": rec.volume_reduction_pct,
            "clinical_explanation": rec.explanation,
        },
        "strategy_comparison": rec.strategy_comparison,
        "growth_parameters": {
            "alpha": round(alpha, 5),
            "carrying_capacity": round(K, 2),
        },
    }
