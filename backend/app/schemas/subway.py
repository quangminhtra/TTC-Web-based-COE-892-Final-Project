from typing import Literal

from pydantic import BaseModel

from app.schemas.common import DataTimestamp


class RapidLine(BaseModel):
    route_id: str
    route_name: str
    mode: Literal["subway", "streetcar"]
    color: str | None = None


class RapidLinesResponse(DataTimestamp):
    lines: list[RapidLine]


class LineStation(BaseModel):
    station_id: str
    station_name: str
    sequence: int
    interchange_route_ids: list[str]


class LineStationsResponse(DataTimestamp):
    route_id: str
    route_name: str
    mode: Literal["subway", "streetcar"]
    color: str | None = None
    stations: list[LineStation]


class ConnectedRoute(BaseModel):
    route_id: str
    route_name: str
    mode: Literal["bus", "streetcar", "subway"]


class StationRouteStatus(BaseModel):
    route_id: str
    route_name: str
    status: Literal["normal", "delayed", "planned", "disrupted"]
    mode: Literal["subway", "streetcar"]


class StationDetailResponse(DataTimestamp):
    station_id: str
    station_name: str
    primary_route_id: str | None = None
    primary_route_name: str | None = None
    connected_routes: list[ConnectedRoute]
    line_statuses: list[StationRouteStatus]
