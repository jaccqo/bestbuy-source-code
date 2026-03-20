import tempfile
import pandas as pd
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from db import SessionLocal
from models import ScrapedItem, HandleDataSettings

router = APIRouter(prefix="/export", tags=["export"])

@router.get("/{format}")
def export_data(format: str):
    if format not in {"csv", "xlsx", "json", "txt"}:
        raise HTTPException(status_code=400, detail="Invalid format")

    db = SessionLocal()
    try:
        # 1. Load filter settings
        settings = db.query(HandleDataSettings).first()
        query = db.query(ScrapedItem)

        if settings:
            if settings.filter == "in_stock":
                query = query.filter(ScrapedItem.availability == "in_stock")
            elif settings.filter == "out_of_stock":
                query = query.filter(ScrapedItem.availability == "out_of_stock")

        rows = query.all()
        if not rows:
            raise HTTPException(status_code=404, detail="No data found with current filter")

        # 2. Handle JSON export separately (Preserves nested structure)
        if format == "json":
            full_json_data = []
            for r in rows:
                full_json_data.append({
                    "sku": r.sku,
                    "title": r.title,
                    "price": r.price,
                    "availability": r.availability,
                    "brand": r.brand,
                    "model": r.model,
                    "url": r.url,
                    "image": r.image,
                    "source_url": r.source_url,
                    "raw_schema": r.raw_schema,  # Kept for JSON
                    "extra_specifications": r.extra_specifications or {}, 
                    "scraped_at": r.scraped_at.isoformat() if r.scraped_at else None,
                    "updated_at": r.updated_at.isoformat() if r.updated_at else None,
                })
            
            suffix = ".json"
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
            path = tmp.name
            tmp.close()
            with open(path, "w", encoding="utf-8") as f:
                json.dump(full_json_data, f, indent=2, default=str)

        # 3. Handle Flat Formats (CSV, XLSX, TXT)
        else:
            data = []
            for r in rows:
                # raw_schema_json OMITTED here to keep files clean
                item = {
                    "sku": r.sku,
                    "title": r.title,
                    "price": r.price,
                    "availability": r.availability,
                    "brand": r.brand,
                    "model": r.model,
                    "url": r.url,
                    "image": r.image,
                    "source_url": r.source_url,
                    "is_active": r.is_active,
                    "scraped_at": r.scraped_at.isoformat() if r.scraped_at else None,
                    "updated_at": r.updated_at.isoformat() if r.updated_at else None,
                }

                # Flatten extra specifications into columns
                extra = r.extra_specifications or {}
                for section, specs in extra.items():
                    if isinstance(specs, dict):
                        for key, value in specs.items():
                            col_name = f"{section.lower().replace(' ', '_')}_{key.lower().replace(' ', '_').replace('-', '_').replace('/', '_')}"
                            col_name = col_name.strip("_").replace("__", "_")
                            item[col_name] = value

                data.append(item)

            df = pd.DataFrame(data)
            suffix = ".xlsx" if format == "xlsx" else f".{format}"
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
            path = tmp.name
            tmp.close()

            if format == "csv":
                df.to_csv(path, index=False)
            elif format == "xlsx":
                df.to_excel(path, index=False)
            elif format == "txt":
                with open(path, "w", encoding="utf-8") as f:
                    formatted = df.to_string(
                        index=False,
                        justify="left",
                        col_space=4,
                        na_rep="N/A",
                        line_width=200,
                        max_colwidth=50,
                    )
                    f.write("BEST BUY SCRAPED DATA EXPORT\n")
                    f.write("=" * 80 + "\n\n")
                    f.write(formatted)
                    f.write("\n\n" + "=" * 80 + "\n")
                    f.write(f"Total items: {len(df)}\n")
                    f.write(f"Exported on: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

        # 4. Return the file
        filename = f"bestbuy_full_export{suffix}"
        return FileResponse(
            path,
            media_type="application/octet-stream",
            filename=filename,
        )

    finally:
        db.close()