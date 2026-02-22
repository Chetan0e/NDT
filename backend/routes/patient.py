"""
Patient Route — CRUD operations for patient and scan records.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db, Patient, Scan, GrowthRecord
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


@router.get("/patient/{patient_id}", summary="Get Patient + Scan History")
def get_patient(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter_by(patient_id=patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    scans = db.query(Scan).filter_by(patient_id=patient_id).order_by(Scan.scan_date).all()

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
        },
        "scans": [
            {
                "id": s.id,
                "scan_date": s.scan_date,
                "tumor_volume_mm3": s.tumor_volume_mm3,
                "tumor_volume_cc": s.tumor_volume_cc,
                "has_radiomics": s.radiomics is not None,
                "has_vector": s.patient_vector is not None,
            }
            for s in scans
        ],
        "scan_count": len(scans),
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
    return [
        {"patient_id": p.patient_id, "name": p.name, "diagnosis": p.diagnosis}
        for p in patients
    ]


@router.delete("/patient/{patient_id}", summary="Delete Patient")
def delete_patient(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter_by(patient_id=patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    db.query(Scan).filter_by(patient_id=patient_id).delete()
    db.delete(patient)
    db.commit()
    return {"status": "deleted", "patient_id": patient_id}
