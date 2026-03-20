from typing import Literal

from pydantic import BaseModel

from app.schemas.common import DataTimestamp


class RouteStatus(BaseModel):
    route_id: str
    route_name: str
    mode: Literal["bus", "streetcar", "subway"]
    status: Literal["normal", "delayed", "planned", "disrupted"]
    source: Literal["gtfs_rt", "gtfs_static"]


class RouteStatusResponse(DataTimestamp):
    route: RouteStatus
