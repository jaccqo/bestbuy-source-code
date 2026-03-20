from pydantic import BaseModel

class DailyScraperStat(BaseModel):
    day: str
    succeeded: int
    failed: int
