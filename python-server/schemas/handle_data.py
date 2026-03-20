from pydantic import BaseModel
from typing import Optional, Literal


class HandleDataSettingsResponse(BaseModel):
    filter: Literal["all", "in_stock", "out_of_stock"]
    updateOriginal: bool

    class Config:
        from_attributes = True


class HandleDataSettingsUpdate(BaseModel):
    filter: Optional[Literal["all", "in_stock", "out_of_stock"]] = None
    updateOriginal: Optional[bool] = None
