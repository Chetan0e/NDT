"""
Routes package — all API routers
"""
from routes import upload, predict, patient, features, fusion, twin, rl, survival, analytics

__all__ = [
    "upload", "predict", "patient", "features",
    "fusion", "twin", "rl", "survival", "analytics"
]
