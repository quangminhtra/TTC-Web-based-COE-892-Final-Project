from typing import Literal

from pydantic import BaseModel

from app.schemas.common import DataTimestamp


class AlertItem(BaseModel):
    id: str
    title: str
    message: str
    severity: Literal["info", "warning", "critical"]
    affected_mode: Literal["bus", "streetcar", "subway", "system"]


class AlertsResponse(DataTimestamp):
    alerts: list[AlertItem]
