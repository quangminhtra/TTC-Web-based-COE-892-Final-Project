from typing import Literal

from pydantic import BaseModel

from app.schemas.common import DataTimestamp


class NearbyStop(BaseModel):
    stop_id: str
    stop_name: str
    route_names: list[str]
    distance_meters: int
    mode: Literal["bus", "streetcar", "subway"]


class NearbyStopsResponse(DataTimestamp):
    latitude: float
    longitude: float
    stops: list[NearbyStop]
