from fastapi import APIRouter, Query

from app.schemas.arrivals import ArrivalsResponse
from app.schemas.stops import NearbyStopsResponse
from app.services.dashboard import get_nearby_stops, get_stop_arrivals

router = APIRouter(prefix="/stops", tags=["stops"])


@router.get("/nearby", response_model=NearbyStopsResponse)
def nearby_stops(lat: float = Query(...), lon: float = Query(...)) -> NearbyStopsResponse:
    return get_nearby_stops(latitude=lat, longitude=lon)


@router.get("/{stop_id}/arrivals", response_model=ArrivalsResponse)
def stop_arrivals(stop_id: str) -> ArrivalsResponse:
    return get_stop_arrivals(stop_id)
