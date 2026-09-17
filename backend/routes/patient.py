"""
Patient Route — CRUD operations for patient and scan records.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db, Patient, Scan, GrowthRecord, TherapySimulation
from datetime import datetime

router = APIRouter()


# ─── Request Schemas ──────────────────────────────────────────────────────────

class CreatePatientRequest(BaseModel):
    patient_id: str
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    diagnosis: Optional[str] = "Glioma"
    kps_score: Optional[int] = None
    tumor_grade: Optional[int] = None
    idh_mutation: bool = False
    mgmt_methylation: bool = False


class SaveScanRequest(BaseModel):
    patient_id: str
    scan_date: str
    tumor_volume_mm3: float
    tumor_volume_cc: Optional[float] = None
    radiomics: Optional[dict] = None
    patient_vector: Optional[list] = None
    notes: Optional[str] = None


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/patient/create", summary="Create Patient Record")
def create_patient(req: CreatePatientRequest, db: Session = Depends(get_db)):
    existing = db.query(Patient).filter_by(patient_id=req.patient_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Patient ID already exists.")

    patient = Patient(**req.model_dump())
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return {"status": "created", "id": patient.id, "patient_id": patient.patient_id}


class UpdatePatientRequest(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    diagnosis: Optional[str] = None
    kps_score: Optional[int] = None
    tumor_grade: Optional[int] = None
    idh_mutation: Optional[bool] = None
    mgmt_methylation: Optional[bool] = None
    egfr_amplification: Optional[bool] = None
    tp53_mutation: Optional[bool] = None
    prior_treatments: Optional[int] = None


@router.put("/patient/{patient_id}", summary="Update Patient Record")
def update_patient(patient_id: str, req: UpdatePatientRequest, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter_by(patient_id=patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    update_data = req.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(patient, field, val)

    db.commit()
    db.refresh(patient)
    return {"status": "updated", "patient_id": patient.patient_id}


@router.get("/patient/{patient_id}", summary="Get Patient + Scan History")
def get_patient(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter_by(patient_id=patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    scans = db.query(Scan).filter_by(patient_id=patient_id).order_by(Scan.scan_date).all()
    growth_record = db.query(GrowthRecord).filter_by(patient_id=patient_id).order_by(GrowthRecord.created_at.desc()).first()

    return {
        "patient": {
            "id": patient.id,
            "patient_id": patient.patient_id,
            "name": patient.name,
            "age": patient.age,
            "gender": patient.gender,
            "diagnosis": patient.diagnosis,
            "kps_score": patient.kps_score,
            "tumor_grade": patient.tumor_grade,
            "idh_mutation": patient.idh_mutation,
            "mgmt_methylation": patient.mgmt_methylation,
            "egfr_amplification": getattr(patient, "egfr_amplification", False),
            "tp53_mutation": getattr(patient, "tp53_mutation", False),
            "prior_treatments": getattr(patient, "prior_treatments", 0),
            "created_at": patient.created_at.isoformat() if patient.created_at else None,
        },
        "scans": [
            {
                "id": s.id,
                "scan_date": s.scan_date,
                "tumor_volume_mm3": s.tumor_volume_mm3,
                "tumor_volume_cc": s.tumor_volume_cc,
                "enhancing_volume": s.enhancing_volume,
                "necrotic_volume": s.necrotic_volume,
                "edema_volume": s.edema_volume,
                "dice_score": s.dice_score,
                "has_radiomics": s.radiomics is not None,
                "radiomics": s.radiomics,
                "has_vector": s.patient_vector is not None,
                "notes": s.notes,
            }
            for s in scans
        ],
        "scan_count": len(scans),
        "latest_scan": {
            "scan_date": scans[-1].scan_date,
            "tumor_volume_cc": scans[-1].tumor_volume_cc,
        } if scans else None,
        "growth_record": {
            "growth_rate_alpha": growth_record.growth_rate_alpha,
            "carrying_capacity": growth_record.carrying_capacity,
            "predicted_volume_30d": growth_record.predicted_volume_30d,
            "predicted_volume_60d": growth_record.predicted_volume_60d,
            "predicted_volume_90d": growth_record.predicted_volume_90d,
            "growth_label": growth_record.growth_label,
            "optimal_therapy": growth_record.optimal_therapy,
        } if growth_record else None,
    }


@router.post("/scan/save", summary="Save Scan Record")
def save_scan(req: SaveScanRequest, db: Session = Depends(get_db)):
    scan = Scan(
        patient_id=req.patient_id,
        scan_date=req.scan_date,
        tumor_volume_mm3=req.tumor_volume_mm3,
        tumor_volume_cc=req.tumor_volume_cc or round(req.tumor_volume_mm3 / 1000, 4),
        radiomics=req.radiomics,
        patient_vector=req.patient_vector,
        notes=req.notes,
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)
    return {"status": "saved", "scan_id": scan.id}


@router.get("/patients", summary="List All Patients")
def list_patients(db: Session = Depends(get_db)):
    patients = db.query(Patient).all()
    results = []
    for p in patients:
        scans = db.query(Scan).filter_by(patient_id=p.patient_id).order_by(Scan.scan_date).all()
        latest_vol = scans[-1].tumor_volume_cc if scans else None
        latest_date = scans[-1].scan_date if scans else None
        results.append({
            "patient_id": p.patient_id,
            "name": p.name,
            "age": p.age,
            "gender": p.gender,
            "diagnosis": p.diagnosis,
            "tumor_grade": p.tumor_grade,
            "kps_score": p.kps_score,
            "idh_mutation": p.idh_mutation,
            "mgmt_methylation": p.mgmt_methylation,
            "egfr_amplification": getattr(p, "egfr_amplification", False),
            "tp53_mutation": getattr(p, "tp53_mutation", False),
            "scan_count": len(scans),
            "latest_volume_cc": latest_vol,
            "latest_scan_date": latest_date,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })
    return results


@router.delete("/patient/{patient_id}", summary="Delete Patient")
def delete_patient(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter_by(patient_id=patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    db.query(Scan).filter_by(patient_id=patient_id).delete()
    db.query(GrowthRecord).filter_by(patient_id=patient_id).delete()
    db.query(TherapySimulation).filter_by(patient_id=patient_id).delete()
    db.delete(patient)
    db.commit()
    return {"status": "deleted", "patient_id": patient_id}

