"""
NeuroDigital Twin — FastAPI Application Entry Point  v2.0
Full AI pipeline:
  MRI Upload → 3D U-Net Segmentation → Radiomics Extraction
  → Multi-Modal Fusion → Digital Twin ODE Simulation
  → RL Therapy Optimization → Survival Prediction
"""
import logging
import time
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.openapi.utils import get_openapi

from database import init_db
from routes import upload, predict, patient, features, fusion, twin, rl, survival, analytics

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("ndt.app")


# ─────────────────────────────────────────────────────────────────────────────
# Lifespan (startup / shutdown)
# ─────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize DB tables and pre-warm any models on startup."""
    logger.info("NeuroDigital Twin starting up...")
    init_db()
    logger.info("Database tables ready.")

    # Pre-warm segmentor (loads weights once, not per request)
    try:
        from models.segmentor import segmentor  # noqa – triggers singleton init
        logger.info("Segmentor model loaded.")
    except Exception as e:
        logger.warning("Segmentor pre-warm failed: %s", e)

    yield

    logger.info("NeuroDigital Twin shutting down.")


# ─────────────────────────────────────────────────────────────────────────────
# App
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="NeuroDigital Twin API",
    description=(
        "**AI-powered neuro-oncology research platform.**\n\n"
        "Full pipeline: MRI segmentation → radiomics → multi-modal fusion → "
        "digital twin ODE simulation → RL therapy optimization → survival prediction.\n\n"
        "> ⚠️ **Research & demonstration use only. Not clinically validated.**"
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ─────────────────────────────────────────────────────────────────────────────
# Middleware
# ─────────────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1024)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Log request latency and add X-Process-Time header."""
    t0 = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - t0) * 1000
    response.headers["X-Process-Time-Ms"] = f"{elapsed_ms:.2f}"
    logger.info("%s %s -> %d  (%.1f ms)", request.method, request.url.path, response.status_code, elapsed_ms)
    return response


# ─────────────────────────────────────────────────────────────────────────────
# Routers
# ─────────────────────────────────────────────────────────────────────────────

app.include_router(upload.router,   tags=["1 · MRI Upload & Segmentation"])
app.include_router(predict.router,  tags=["2 · Growth Prediction"])
app.include_router(patient.router,  tags=["3 · Patient Records"])
app.include_router(features.router, tags=["4 · Radiomics Interpretation"])
app.include_router(fusion.router,   tags=["5 · Multi-Modal Fusion"])
app.include_router(twin.router,     tags=["6 · Digital Twin Simulation"])
app.include_router(rl.router,       tags=["7 · RL Therapy Optimizer"])
app.include_router(survival.router, tags=["8 · Survival Prediction"])
app.include_router(analytics.router,tags=["9 · Analytics & Reporting"])


# ─────────────────────────────────────────────────────────────────────────────
# Core Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"], summary="Platform status")
def root():
    return {
        "status": "online",
        "platform": "NeuroDigital Twin",
        "version": "2.0.0",
        "pipeline_modules": [
            "mri_segmentation",
            "radiomics_extraction",
            "multi_modal_fusion",
            "growth_prediction",
            "digital_twin_ode",
            "rl_therapy_optimizer",
            "survival_prediction",
            "analytics_reporting",
        ],
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"], summary="Health check")
def health():
    return {"status": "healthy", "timestamp": time.time()}


@app.get("/pipeline", tags=["Health"], summary="Full pipeline specification")
def pipeline_spec():
    """Returns full description of the AI pipeline stages and their relationships."""
    return {
        "stages": [
            {
                "step": 1, "name": "MRI Segmentation",
                "endpoint": "POST /upload",
                "model": "3D U-Net (MONAI)",
                "output": "Binary tumor mask + volume (mm³/cc)"
            },
            {
                "step": 2, "name": "Radiomics Extraction",
                "endpoint": "POST /upload (extract_radiomics=true)",
                "model": "PyRadiomics",
                "output": "100+ quantitative imaging biomarkers"
            },
            {
                "step": 3, "name": "Multi-Modal Fusion",
                "endpoint": "POST /fusion",
                "model": "3-branch MLP (64-dim PSV)",
                "output": "Patient State Vector (64 floats)"
            },
            {
                "step": 4, "name": "Growth Prediction",
                "endpoint": "POST /predict",
                "model": "Logistic/Exponential Regression",
                "output": "30/60/90-day volume forecasts"
            },
            {
                "step": 5, "name": "Digital Twin Simulation",
                "endpoint": "POST /simulate",
                "model": "ODE: dV/dt = αV(1-V/K) - βT",
                "output": "Day-by-day trajectory curve"
            },
            {
                "step": 6, "name": "RL Therapy Optimization",
                "endpoint": "POST /optimize",
                "model": "PPO Agent (Gymnasium env)",
                "output": "Optimal therapy strategy + explanation"
            },
            {
                "step": 7, "name": "Survival Prediction",
                "endpoint": "POST /survival/predict",
                "model": "Cox PH + Random Survival Forest",
                "output": "Survival probability curves + OS estimate"
            },
        ]
    }


# ─────────────────────────────────────────────────────────────────────────────
# Exception Handlers
# ─────────────────────────────────────────────────────────────────────────────

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(status_code=422, content={"error": str(exc), "type": "ValueError"})


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception on %s: %s", request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "type": type(exc).__name__},
    )
