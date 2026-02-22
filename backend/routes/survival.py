"""
Survival Prediction Route
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from models.survival import survival_predictor

router = APIRouter()


class SurvivalRequest(BaseModel):
    patient_id: Optional[str] = None

    # Demographics
    age: int = Field(55, ge=18, le=100)
    kps_score: int = Field(80, ge=0, le=100, description="Karnofsky Performance Score")

    # Pathology
    tumor_grade: int = Field(4, ge=1, le=4)
    extent_of_resection: str = Field("subtotal",
        description="gross_total | subtotal | biopsy")

    # Genomics
    idh_mutation: bool = False
    mgmt_methylation: bool = False
    egfr_amplification: bool = False
    tp53_mutation: bool = False
    recurrent: bool = False

    # Tumor metrics (from segmentation / growth model)
    tumor_volume_cc: float = Field(30.0, ge=0)
    growth_rate_alpha: float = Field(0.02, ge=0)

    # Radiomics (optional, enriches prediction)
    entropy: Optional[float] = None
    sphericity: Optional[float] = None

    # Custom timepoints (months)
    timepoints_months: list[int] = [1, 3, 6, 9, 12, 18, 24, 30, 36]


@router.post("/survival/predict", summary="Predict Overall Survival (OS)")
def predict_survival(req: SurvivalRequest):
    """
    Estimate overall survival probability curve for a glioma patient.

    Uses Cox PH hazard ratios from published GBM literature (TCGA, Stupp 2005)
    combined with patient-specific tumor characteristics.

    Returns:
    - Median OS estimate in months
    - Kaplan-Meier style survival curve at each timepoint
    - Risk stratification (Low / Intermediate / High / Very High)
    - Breakdown of favorable and adverse prognostic factors
    """
    try:
        result = survival_predictor.predict(
            age=req.age,
            kps_score=req.kps_score,
            tumor_grade=req.tumor_grade,
            idh_mutation=req.idh_mutation,
            mgmt_methylation=req.mgmt_methylation,
            egfr_amplification=req.egfr_amplification,
            tp53_mutation=req.tp53_mutation,
            tumor_volume_cc=req.tumor_volume_cc,
            growth_rate_alpha=req.growth_rate_alpha,
            entropy=req.entropy,
            sphericity=req.sphericity,
            extent_of_resection=req.extent_of_resection,
            recurrent=req.recurrent,
            timepoints_months=req.timepoints_months,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "patient_id": req.patient_id,
        "median_os_months": result.median_os_months,
        "confidence_interval_months": {
            "lower": result.confidence_interval_months[0],
            "upper": result.confidence_interval_months[1],
        },
        "survival_probabilities": result.survival_probabilities,
        "kaplan_meier_curve": result.kaplan_meier_curve,
        "risk_level": result.risk_level,
        "cumulative_hazard_ratio": result.risk_score,
        "favorable_factors": result.favorable_factors,
        "adverse_factors": result.adverse_factors,
        "clinical_explanation": result.explanation,
        "disclaimer": (
            "Research estimate only. Based on published GBM hazard ratios. "
            "Not validated for individual clinical decisions."
        ),
    }


@router.get("/survival/reference", summary="Population reference survival curves")
def survival_reference():
    """Returns Kaplan-Meier reference curves for GBM subgroups from published literature."""
    return {
        "source": "Stupp et al. NEJM 2005; TCGA-GBM; EORTC 26981",
        "cohorts": {
            "GBM_IDHwt_MGMT_unmethylated": {
                "description": "IDH wild-type GBM, MGMT unmethylated (worst prognosis)",
                "median_os_months": 11.8,
                "curve": {1: 0.97, 3: 0.86, 6: 0.72, 9: 0.58, 12: 0.42, 18: 0.22, 24: 0.09}
            },
            "GBM_IDHwt_MGMT_methylated": {
                "description": "IDH wild-type GBM, MGMT methylated",
                "median_os_months": 21.7,
                "curve": {1: 0.99, 3: 0.93, 6: 0.84, 9: 0.73, 12: 0.62, 18: 0.44, 24: 0.28}
            },
            "GBM_IDHmut": {
                "description": "IDH mutant GBM (rare, ~5–10%), much better prognosis",
                "median_os_months": 36.0,
                "curve": {1: 1.0, 3: 0.98, 6: 0.94, 9: 0.88, 12: 0.80, 18: 0.66, 24: 0.52}
            },
            "Grade3_IDHmut": {
                "description": "Grade III IDH mutant — best prognosis in this framework",
                "median_os_months": 72.0,
                "curve": {1: 1.0, 3: 1.0, 6: 0.98, 9: 0.96, 12: 0.93, 18: 0.87, 24: 0.79}
            },
        }
    }
