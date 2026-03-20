# routers/stats.py
from fastapi import APIRouter
from datetime import date, timedelta

from db import SessionLocal
from models import ScraperDailyStat
from schemas import DailyScraperStat

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/scraper/weekly")
def get_weekly_scraper_stats():
    today = date.today()
    days = [today - timedelta(days=i) for i in reversed(range(7))]
    names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    db = SessionLocal()
    try:
        out = []
        for d in days:
            stat = db.query(ScraperDailyStat).filter_by(date=d).first()
            out.append(
                DailyScraperStat(
                    day=names[d.weekday()],
                    succeeded=stat.succeeded if stat else 0,
                    failed=stat.failed if stat else 0,
                )
            )
        return out
    finally:
        db.close()
