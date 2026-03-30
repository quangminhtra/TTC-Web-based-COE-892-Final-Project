from app.schemas.alerts import AlertItem, AlertsResponse
from app.schemas.analytics import DelayPoint, DelaysResponse, DemandPoint, DemandResponse
from app.schemas.arrivals import ArrivalItem, ArrivalsResponse
from app.schemas.overview import OverviewCard, OverviewResponse
from app.schemas.routes import RouteStatus, RouteStatusResponse
from app.schemas.stops import NearbyStop, NearbyStopsResponse
from app.schemas.subway import LineStationsResponse, RapidLinesResponse, StationDetailResponse
from app.repositories import dashboard as dashboard_repository


def get_overview() -> OverviewResponse:
    try:
        return dashboard_repository.fetch_overview()
    except Exception:
        return OverviewResponse(
            cards=[
                OverviewCard(label="Live Surface Vehicles", value="--", helper="Database not connected"),
                OverviewCard(label="Subway Stations", value="--", helper="Static GTFS import pending"),
                OverviewCard(label="Feed Freshness", value="Unknown", helper="Worker has not reported status"),
                OverviewCard(label="Demand Engine", value="Planned", helper="Simulated analytics pipeline"),
            ]
        )


def get_alerts() -> AlertsResponse:
    try:
        return dashboard_repository.fetch_alerts()
    except Exception:
        return AlertsResponse(alerts=[])


def get_nearby_stops(latitude: float, longitude: float) -> NearbyStopsResponse:
    try:
        return dashboard_repository.fetch_nearby_stops(latitude=latitude, longitude=longitude)
    except Exception:
        return NearbyStopsResponse(latitude=latitude, longitude=longitude, stops=[])


def get_stop_arrivals(stop_id: str) -> ArrivalsResponse:
    try:
        return dashboard_repository.fetch_stop_arrivals(stop_id)
    except Exception:
        return ArrivalsResponse(arrivals=[])


def get_subway_arrivals(station_id: str) -> ArrivalsResponse:
    try:
        return dashboard_repository.fetch_subway_arrivals(station_id)
    except Exception:
        return ArrivalsResponse(arrivals=[])


def get_rapid_lines() -> RapidLinesResponse:
    return dashboard_repository.fetch_rapid_lines()


def get_line_stations(route_id: str) -> LineStationsResponse:
    return dashboard_repository.fetch_line_stations(route_id)


def get_station_detail(station_id: str) -> StationDetailResponse:
    return dashboard_repository.fetch_station_detail(station_id)


def get_route_status(route_id: str) -> RouteStatusResponse:
    try:
        return dashboard_repository.fetch_route_status(route_id)
    except Exception:
        return RouteStatusResponse(
            route=RouteStatus(
                route_id=route_id,
                route_name=f"Route {route_id}",
                mode="streetcar",
                status="normal",
                source="gtfs_rt",
            )
        )


def get_demand() -> DemandResponse:
    try:
        return dashboard_repository.fetch_demand()
    except Exception:
        return DemandResponse(demand=[])


def get_delays() -> DelaysResponse:
    try:
        return dashboard_repository.fetch_delays()
    except Exception:
        return DelaysResponse(delays=[])
