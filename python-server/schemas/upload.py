from pydantic import BaseModel
from typing import List

class UploadResponse(BaseModel):
    filename: str
    sku_count: int
    column_count: int
    column_names: List[str]
