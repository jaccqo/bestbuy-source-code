from fastapi import APIRouter

from db import SessionLocal
from models import HandleDataSettings
from schemas import (
    HandleDataSettingsResponse,
    HandleDataSettingsUpdate,
)
from utils.logging import write_log

router = APIRouter(
    prefix="/handle-data",
    tags=["handle-data"],
)


def get_or_create(db):
    s = db.query(HandleDataSettings).first()

    if not s:
        s = HandleDataSettings()
        db.add(s)
        db.commit()
        db.refresh(s)

    return s


@router.get("", response_model=HandleDataSettingsResponse)
def get_handle_data_settings():
    db = SessionLocal()
    try:
        s = get_or_create(db)

        return {
            "filter": s.filter,
            "updateOriginal": bool(s.update_original),
        }
    finally:
        db.close()


@router.patch("", response_model=HandleDataSettingsResponse)
def update_handle_data_settings(update: HandleDataSettingsUpdate):
    db = SessionLocal()
    try:
        s = get_or_create(db)

        if update.filter is not None:
            s.filter = update.filter

        if update.updateOriginal is not None:
            s.update_original = bool(update.updateOriginal)

        db.commit()
        write_log(db, "INFO", "Handle data settings updated")

        return {
            "filter": s.filter,
            "updateOriginal": bool(s.update_original),
        }
    finally:
        db.close()
