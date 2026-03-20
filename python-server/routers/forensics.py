from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from db import SessionLocal
from models import ScraperForensics
from schemas.forensics import ScraperForensicsOut

router = APIRouter(prefix="/forensics", tags=["forensics"])

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=List[ScraperForensicsOut])
def get_forensics_logs(limit: int = 500, db: Session = Depends(get_db)):
    try:
        # 1. IDENTIFY DUPLICATES
        # We find SKUs that appear more than once
        from sqlalchemy import func
        duplicate_skus = db.query(ScraperForensics.sku)\
            .group_by(ScraperForensics.sku)\
            .having(func.count(ScraperForensics.sku) > 1)\
            .all()

        # 2. PURGE DUPLICATES
        for (sku_str,) in duplicate_skus:
            if not sku_str: continue
            
            # Get all records for this SKU ordered by the most recent scrape
            records = db.query(ScraperForensics)\
                .filter_by(sku=sku_str)\
                .order_by(ScraperForensics.scraped_at.desc())\
                .all()
            
            # Keep the newest one (index 0), delete the rest
            for stale_record in records[1:]:
                db.delete(stale_record)
        
        # Commit the cleanup
        if duplicate_skus:
            db.commit()

        # 3. RETURN CLEAN DATA
        logs = db.query(ScraperForensics)\
                 .order_by(ScraperForensics.scraped_at.desc())\
                 .limit(limit)\
                 .all()
        return logs

    except Exception as e:
        db.rollback()
        # Fallback: if cleanup fails, just return whatever is there to keep UI alive
        return db.query(ScraperForensics).order_by(ScraperForensics.scraped_at.desc()).limit(limit).all()
    

@router.delete("/clear")
def clear_forensics(db: Session = Depends(get_db)):
    try:
        db.query(ScraperForensics).delete()
        db.commit()
        return {"message": "Forensics logs cleared successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# NEW: Endpoint to remove a single item by SKU
@router.delete("/{sku}", status_code=status.HTTP_200_OK)
def delete_forensics_log(sku: str, db: Session = Depends(get_db)):
    """
    Deletes a specific forensic log record by its SKU.
    """
    # Look for the record
    log_item = db.query(ScraperForensics).filter(ScraperForensics.sku == sku).first()
    
    if not log_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Log item with SKU {sku} not found"
        )
    
    try:
        db.delete(log_item)
        db.commit()
        return {"message": f"Log item {sku} deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))