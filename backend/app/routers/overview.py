from fastapi import APIRouter

from app.schemas.overview import OverviewResponse
from app.services.dashboard import get_overview

router = APIRouter(prefix="/overview", tags=["overview"])


@router.get("", response_model=OverviewResponse)
def overview() -> OverviewResponse:
    return get_overview()
