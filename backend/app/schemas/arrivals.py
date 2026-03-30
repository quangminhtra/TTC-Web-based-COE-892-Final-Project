from typing import Literal

from pydantic import BaseModel

from app.schemas.common import DataTimestamp


class ArrivalItem(BaseModel):
    route_id: str
    route_name: str
    destination: str
    stop_id: str
    stop_name: str
    arrival_in_minutes: int
    arrival_type: Literal["live", "scheduled"]
    mode: Literal["bus", "streetcar", "subway"]
    crowd_level: Literal["low", "medium", "high"]


class ArrivalsResponse(DataTimestamp):
    arrivals: list[ArrivalItem]
