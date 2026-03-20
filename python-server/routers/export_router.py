from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import pandas as pd
import tempfile
import os

from db import SessionLocal           # <-- your existing SessionLocal
from models import ScrapedItem        # <-- your SQLAlchemy model

router = APIRouter(prefix="/export", tags=["export"])


def load_scraped_data(db: Session) -> pd.DataFrame:
    rows = db.query(ScrapedItem).all()

    if not rows:
        raise HTTPException(status_code=400, detail="No scraped data to export")

    return pd.DataFrame(
        [
            {
                "SKU": r.sku,
                "Title": r.title,
                "Price": r.price,
                "Availability": r.availability,
            }
            for r in rows
        ]
    )


@router.get("/{format}")
def export_data(format: str):
    format = format.lower()

    if format not in {"csv", "xls", "json", "txt"}:
        raise HTTPException(status_code=400, detail="Invalid export format")

    db = SessionLocal()
    try:
        # 1️⃣ Load from DB
        df = load_scraped_data(db)

        # 2️⃣ Temp file
        suffix = ".xlsx" if format == "xls" else f".{format}"
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        path = tmp.name
        tmp.close()

        # 3️⃣ Write file
        if format == "csv":
            df.to_csv(path, index=False)

        elif format == "xls":
            df.to_excel(path, index=False)

        elif format == "json":
            df.to_json(path, orient="records", indent=2)

        elif format == "txt":
            with open(path, "w", encoding="utf-8") as f:
                f.write(df.to_string(index=False))

        # 4️⃣ Send file
        return FileResponse(
            path,
            filename=f"scraped_data{suffix}",
            media_type="application/octet-stream",
        )

    finally:
        db.close()
