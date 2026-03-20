from pydantic import BaseModel
from typing import Optional

class ScrapedItemOut(BaseModel):
    sku: str
    title: Optional[str] = None
    price: Optional[float] = None
    availability: Optional[str] = None
