from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ScraperForensicsBase(BaseModel):
    sku: str
    title: Optional[str] = None
    price: Optional[float] = None
    brand: Optional[str] = None
    status: str  # "Success" or "Failed"
    source_url: Optional[str] = None

class ScraperForensicsCreate(ScraperForensicsBase):
    error_details: Optional[str] = None
    run_id: Optional[int] = None

class ScraperForensicsOut(ScraperForensicsBase):
    id: int
    scraped_at: datetime

    class Config:
        from_attributes = True