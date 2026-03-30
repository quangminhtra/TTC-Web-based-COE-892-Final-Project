from fastapi import APIRouter

from app.schemas.arrivals import ArrivalsResponse
from app.schemas.subway import LineStationsResponse, RapidLinesResponse, StationDetailResponse
from app.services.dashboard import get_line_stations, get_rapid_lines, get_station_detail, get_subway_arrivals

router = APIRouter(prefix="/subway", tags=["subway"])


@router.get("/lines", response_model=RapidLinesResponse)
def rapid_lines() -> RapidLinesResponse:
    return get_rapid_lines()


@router.get("/lines/{route_id}/stations", response_model=LineStationsResponse)
def line_stations(route_id: str) -> LineStationsResponse:
    return get_line_stations(route_id)


@router.get("/stations/{station_id}/detail", response_model=StationDetailResponse)
def station_detail(station_id: str) -> StationDetailResponse:
    return get_station_detail(station_id)


@router.get("/stations/{station_id}/arrivals", response_model=ArrivalsResponse)
def subway_arrivals(station_id: str) -> ArrivalsResponse:
    return get_subway_arrivals(station_id)
