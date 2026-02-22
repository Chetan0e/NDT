"""
Clinical Interpretation Helpers
Converts raw numeric values into clinician-friendly labels and risk assessments.
"""


def interpret_growth(alpha: float) -> str:
    """Classify tumor aggressiveness from growth rate α."""
    if alpha < 0.005:
        return "Indolent (very slow growing)"
    elif alpha < 0.015:
        return "Slow growing"
    elif alpha < 0.03:
        return "Moderate growth"
    elif alpha < 0.06:
        return "Aggressive growth"
    else:
        return "Highly aggressive"


def interpret_volume(volume_cc: float) -> str:
    """Assign a size category to the tumor volume (in cc)."""
    if volume_cc < 5:
        return "Small (< 5 cc)"
    elif volume_cc < 20:
        return "Moderate (5–20 cc)"
    elif volume_cc < 50:
        return "Large (20–50 cc)"
    else:
        return "Very large (> 50 cc)"


def interpret_response(volume_change_pct: float) -> str:
    """Interpret tumor volume change after therapy."""
    if volume_change_pct <= -50:
        return "Complete / near-complete response"
    elif volume_change_pct <= -20:
        return "Partial response"
    elif volume_change_pct <= 10:
        return "Stable disease"
    elif volume_change_pct <= 40:
        return "Progressive disease"
    else:
        return "Rapid progression"


def risk_stratify(alpha: float, volume_cc: float) -> dict:
    """Generate an overall risk level for the tumor."""
    score = 0

    # Growth rate contribution
    if alpha > 0.05:
        score += 3
    elif alpha > 0.02:
        score += 2
    elif alpha > 0.01:
        score += 1

    # Volume contribution
    if volume_cc > 50:
        score += 3
    elif volume_cc > 20:
        score += 2
    elif volume_cc > 5:
        score += 1

    if score <= 1:
        level = "Low"
        color = "green"
    elif score <= 3:
        level = "Intermediate"
        color = "yellow"
    elif score <= 5:
        level = "High"
        color = "orange"
    else:
        level = "Very High"
        color = "red"

    return {
        "risk_score": score,
        "risk_level": level,
        "indicator_color": color,
        "growth_label": interpret_growth(alpha),
        "volume_label": interpret_volume(volume_cc),
    }
