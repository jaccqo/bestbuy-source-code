# routers/meta.py
from fastapi import APIRouter
from db import SessionLocal
from models import ScrapedItem
from sqlalchemy import func

router = APIRouter(prefix="/meta", tags=["meta"])


@router.get("/has-scraped-data")
def has_scraped_data():
    db = SessionLocal()
    try:
        count = db.query(func.count(ScrapedItem.id)).scalar()
        return {"hasData": count > 0}
    finally:
        db.close()
