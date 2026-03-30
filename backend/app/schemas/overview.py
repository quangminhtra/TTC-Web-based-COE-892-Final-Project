from pydantic import BaseModel

from app.schemas.common import DataTimestamp


class OverviewCard(BaseModel):
    label: str
    value: str
    helper: str


class OverviewResponse(DataTimestamp):
    cards: list[OverviewCard]
