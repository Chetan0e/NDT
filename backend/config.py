"""
NeuroDigital Twin — Configuration
"""
import os
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).parent
WEIGHTS_DIR = BASE_DIR / "models" / "weights"
DATA_DIR = BASE_DIR / "data"

os.makedirs(WEIGHTS_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

# Database
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/ndt.db")

# Model paths
MODEL_PATH = str(WEIGHTS_DIR / "unet_brats.pth")
SEGMENTOR_IN_CHANNELS = int(os.getenv("SEGMENTOR_IN_CHANNELS", "1"))

# API settings
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))

# Upload settings
MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "500"))
ALLOWED_EXTENSIONS = {".dcm", ".nii", ".nii.gz", ".mha"}

# BraTS dataset root (set this to your local dataset path)
BRATS_ROOT = os.getenv("BRATS_ROOT", str(DATA_DIR / "brats"))

# Security (for production)
SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")

# Device
DEVICE = os.getenv("DEVICE", "cpu")  # "cuda" for GPU
