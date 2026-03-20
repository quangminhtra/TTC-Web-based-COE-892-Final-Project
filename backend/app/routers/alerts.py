from fastapi import APIRouter

from app.schemas.alerts import AlertsResponse
from app.services.dashboard import get_alerts

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=AlertsResponse)
def alerts() -> AlertsResponse:
    return get_alerts()
