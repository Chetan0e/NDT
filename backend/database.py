"""
NeuroDigital Twin — Database Models
Stores patient metadata, scan records, radiomics features, and fusion vectors.
"""
from sqlalchemy import (
    create_engine, Column, Integer, Float, String,
    DateTime, JSON, Text, Boolean
)
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timezone
from config import DATABASE_URL

# Engine setup
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ─────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────

class Patient(Base):
    """Core patient demographics."""
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(128))
    age = Column(Integer)
    gender = Column(String(16))
    diagnosis = Column(String(256))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Genomic markers
    idh_mutation = Column(Boolean, default=False)
    mgmt_methylation = Column(Boolean, default=False)
    egfr_amplification = Column(Boolean, default=False)
    tp53_mutation = Column(Boolean, default=False)

    # Clinical scores
    kps_score = Column(Integer)             # Karnofsky Performance Score
    tumor_grade = Column(Integer)           # WHO grade (1-4)
    prior_treatments = Column(Integer, default=0)


class Scan(Base):
    """Individual MRI scan records with segmentation results."""
    __tablename__ = "scans"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String(64), index=True, nullable=False)
    scan_date = Column(String(32), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Segmentation outputs
    tumor_volume_mm3 = Column(Float)        # Tumor volume in mm³
    tumor_volume_cc = Column(Float)         # Tumor volume in cc (mL)
    enhancing_volume = Column(Float)        # Enhancing tumor volume
    necrotic_volume = Column(Float)         # Necrotic core volume
    edema_volume = Column(Float)            # Peritumoral edema volume
    dice_score = Column(Float)              # Segmentation quality metric

    # Radiomics features (JSON blob)
    radiomics = Column(JSON)

    # Fusion vector
    patient_vector = Column(JSON)

    # Scan metadata
    modality = Column(String(32), default="MRI")
    notes = Column(Text)


class GrowthRecord(Base):
    """Longitudinal tumor growth tracking and predictions."""
    __tablename__ = "growth_records"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String(64), index=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Growth parameters
    growth_rate_alpha = Column(Float)       # Exponential growth rate
    carrying_capacity = Column(Float)       # Logistic carrying capacity
    treatment_sensitivity = Column(Float)   # Beta parameter

    # Predictions
    predicted_volume_30d = Column(Float)
    predicted_volume_60d = Column(Float)
    predicted_volume_90d = Column(Float)
    growth_label = Column(String(64))       # "Slow" / "Moderate" / "Aggressive"

    # RL therapy recommendation
    optimal_therapy = Column(String(64))
    therapy_score = Column(Float)
    simulation_trajectory = Column(JSON)    # List of (day, volume) pairs


class TherapySimulation(Base):
    """Records of RL therapy simulations."""
    __tablename__ = "therapy_simulations"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String(64), index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Input state
    initial_volume = Column(Float)
    simulation_days = Column(Integer)

    # Results
    best_therapy = Column(String(64))
    therapy_intensity = Column(Float)
    final_volume = Column(Float)
    volume_reduction_pct = Column(Float)

    # Strategy comparison (JSON)
    strategy_comparison = Column(JSON)


# ─────────────────────────────────────────────
# Init DB
# ─────────────────────────────────────────────
def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency for DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Create tables on import
init_db()
