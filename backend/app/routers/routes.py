from fastapi import APIRouter

from app.schemas.routes import RouteStatusResponse
from app.services.dashboard import get_route_status

router = APIRouter(prefix="/routes", tags=["routes"])


@router.get("/{route_id}/status", response_model=RouteStatusResponse)
def route_status(route_id: str) -> RouteStatusResponse:
    return get_route_status(route_id)
