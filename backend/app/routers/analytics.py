from fastapi import APIRouter

from app.schemas.analytics import DelaysResponse, DemandResponse
from app.services.dashboard import get_delays, get_demand

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/demand", response_model=DemandResponse)
def demand() -> DemandResponse:
    return get_demand()


@router.get("/delays", response_model=DelaysResponse)
def delays() -> DelaysResponse:
    return get_delays()
