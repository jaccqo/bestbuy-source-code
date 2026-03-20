from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# 1. Request (enqueue)
class ScraperQueueCreate(BaseModel):
    sku: str


# 2. Basic response
class ScraperQueueResponse(BaseModel):
    id: int
    sku: str
    status: str

    class Config:
        from_attributes = True


# 3. Detailed status
class ScraperQueueStatus(BaseModel):
    id: int
    sku: str
    status: str
    run_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# 4. List response
class ScraperQueueList(BaseModel):
    items: List[ScraperQueueStatus]
    total: int