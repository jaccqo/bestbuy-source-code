from pydantic import BaseModel
from typing import Optional

class ScraperRunResponse(BaseModel):
    count: int

class ScraperRunStatus(BaseModel):
    status: str
    succeeded: Optional[int] = 0
    failed: Optional[int] = 0
    error_message: Optional[str] = None
