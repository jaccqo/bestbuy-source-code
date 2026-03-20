from fastapi import APIRouter, HTTPException
from db import SessionLocal
from models import LicenseKey
from utils.logging import write_log
from pydantic import BaseModel

router = APIRouter(tags=["activation"])

class LicenseKeyIn(BaseModel):
    license_key: str

@router.get("/get_license")
def get_license():
    """Get the saved license key (if any)"""
    db = SessionLocal()
    try:
        license = db.query(LicenseKey).first()
        if license:
            return {"license_key": license.license_key}
        return {"license_key": None}
    finally:
        db.close()

@router.post("/save_license")
def save_license(payload: LicenseKeyIn):
    """Save or update the license key"""
    db = SessionLocal()
    try:
        key = payload.license_key.strip()

        if not key:
            raise HTTPException(status_code=400, detail="License key cannot be empty")

        existing = db.query(LicenseKey).first()

        if existing:
            existing.license_key = key
            write_log(db, "INFO", "License key updated")
        else:
            new_license = LicenseKey(license_key=key)
            db.add(new_license)
            write_log(db, "INFO", "New license key saved")

        db.commit()
        return {"success": True, "message": "License key saved successfully"}
    finally:
        db.close()