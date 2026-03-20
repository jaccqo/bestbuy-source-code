from pydantic import BaseModel
from typing import Optional

class ScraperSettingsResponse(BaseModel):
    headless: bool
    resumeSku: bool

class ScraperSettingsUpdate(BaseModel):
    headless: Optional[bool] = None
    resumeSku: Optional[bool] = None
