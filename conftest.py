"""
pytest configuration — ensures backend is on Python path for all tests.
"""
import sys
from pathlib import Path

# Make sure the backend package is importable
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))
