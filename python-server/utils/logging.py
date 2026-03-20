# utils/logging.py
from datetime import datetime
from models import ScraperLog

def write_log(db, level: str, message: str):
    db.add(
        ScraperLog(
            created_at=datetime.utcnow(),
            level=level,
            message=message,
        )
    )
    db.commit()
