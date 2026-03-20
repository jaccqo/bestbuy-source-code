# routers/logs.py
from fastapi import APIRouter

from db import SessionLocal
from models import ScraperLog
from schemas import LogCreate
from utils.logging import write_log

router = APIRouter(prefix="/logs", tags=["logs"])

from typing import Optional
@router.get("")
def get_logs(
    after_id: Optional[int] = None,
    limit: int = 500, # Default to 500 for  "fast hydrate"
):
    db = SessionLocal()
    try:
        # --- 1. CLEANUP LOGIC ---
        # Keep only the most recent 500 logs in the DB to prevent bloat
        total_count = db.query(ScraperLog).count()
        if total_count > 500:
            # Find the ID of the 500th most recent log
            threshold_log = db.query(ScraperLog.id) \
                .order_by(ScraperLog.id.desc()) \
                .offset(500) \
                .limit(1) \
                .scalar()
            
            if threshold_log:
                # Delete everything older than that ID
                db.query(ScraperLog).filter(ScraperLog.id <= threshold_log).delete()
                db.commit()

        # --- 2. FETCH LOGIC ---
        q = db.query(ScraperLog).order_by(ScraperLog.id.asc())

        if after_id is not None:
            q = q.filter(ScraperLog.id > after_id)

        rows = q.limit(limit).all()

        return [
            {
                "id": r.id,
                "timestamp": r.created_at.strftime("%H:%M:%S"),
                "level": r.level,
                "message": r.message,
            }
            for r in rows
        ]
    finally:
        db.close()

@router.post("")
def create_log(payload: LogCreate):
    db = SessionLocal()
    try:
        write_log(db, payload.level, payload.message)
        return {"ok": True}
    finally:
        db.close()


@router.delete("")
def clear_logs():
    db = SessionLocal()
    try:
        db.query(ScraperLog).delete()
        db.commit()
        return {"ok": True}
    finally:
        db.close()
