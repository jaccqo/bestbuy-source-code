# routers/settings.py
from fastapi import APIRouter

from db import SessionLocal
from models import ScraperSettings
from schemas import ScraperSettingsResponse, ScraperSettingsUpdate
from utils.logging import write_log

from fastapi import HTTPException, status
from sqlalchemy import text 


router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/scraper", response_model=ScraperSettingsResponse)
def get_scraper_settings():
    db = SessionLocal()
    try:
        s = db.query(ScraperSettings).first()
        return {
            "headless": bool(s.headless),
            "resumeSku": bool(s.resume_sku),
        }
    finally:
        db.close()


@router.patch("/scraper", response_model=ScraperSettingsResponse)
def update_scraper_settings(update: ScraperSettingsUpdate):
    db = SessionLocal()
    try:
        s = db.query(ScraperSettings).first()

        if update.headless is not None:
            s.headless = int(update.headless)

        if update.resumeSku is not None:
            s.resume_sku = int(update.resumeSku)

        db.commit()
        write_log(db, "INFO", "Scraper settings updated")

        return {
            "headless": bool(s.headless),
            "resumeSku": bool(s.resume_sku),
        }
    finally:
        db.close()





@router.post("/wipe")
def wipe_database():
    db = SessionLocal()
    try:
        # List of all tables in the order they should be cleared 
        # (if you have foreign key constraints, clear children first)
        tables = [
            "scraper_forensics",
            "scraped_items",
            "scraper_logs",
            "scraper_runs",
            "scraper_daily_stats",
            "uploaded_files",
            # We usually leave 'scraper_settings', 'handle_data_settings', 
            # and 'license_keys' alone if they are global config, 
            # but if you want a TRULY clean slate, uncomment them below:
            # "scraper_settings", 
            # "handle_data_settings",
            # "license_keys"
        ]

        # Use a transaction to ensure all or nothing is wiped
        with db.begin():
            for table in tables:
                # 'CASCADE' helps handle relationships automatically in Postgres
                # For SQLite, DELETE FROM is usually safer
                db.execute(text(f"DELETE FROM {table}"))
        
        write_log(db, "CRITICAL", "System Wipe: All scraped data and logs cleared.")
        return {"status": "success", "message": "Database wiped to clean slate"}
        
    except Exception as e:
        write_log(db, "ERROR", f"Failed system wipe: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="System wipe failed"
        )
    finally:
        db.close()