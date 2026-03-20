from typing import Literal

from pydantic import BaseModel

from app.schemas.common import DataTimestamp


class DemandPoint(BaseModel):
    period: str
    level: Literal["low", "medium", "high"]
    note: str


class DelayPoint(BaseModel):
    route_id: str
    route_name: str
    average_delay_minutes: float


class DemandResponse(DataTimestamp):
    demand: list[DemandPoint]


class DelaysResponse(DataTimestamp):
    delays: list[DelayPoint]
