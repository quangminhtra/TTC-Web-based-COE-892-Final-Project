from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    timestamp: datetime = Field(default_factory=utc_now)


class DataTimestamp(BaseModel):
    last_updated: datetime = Field(default_factory=utc_now)
    is_stale: bool = False
