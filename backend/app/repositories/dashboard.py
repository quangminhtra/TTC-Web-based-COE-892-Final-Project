from datetime import datetime, timezone

from app.db import get_connection
from app.schemas.alerts import AlertItem, AlertsResponse
from app.schemas.analytics import DelayPoint, DelaysResponse, DemandPoint, DemandResponse
from app.schemas.arrivals import ArrivalItem, ArrivalsResponse
from app.schemas.overview import OverviewCard, OverviewResponse
from app.schemas.routes import RouteStatus, RouteStatusResponse
from app.schemas.stops import NearbyStop, NearbyStopsResponse
from app.schemas.subway import (
    ConnectedRoute,
    LineStation,
    LineStationsResponse,
    RapidLine,
    RapidLinesResponse,
    StationDetailResponse,
    StationRouteStatus,
)


RAPID_ROUTE_IDS = ('1', '2', '4', '5')


def fetch_overview() -> OverviewResponse:
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) AS count FROM vehicle_positions")
            live_vehicles = cursor.fetchone()["count"]

            cursor.execute("SELECT COUNT(*) AS count FROM stops WHERE mode = 'subway'")
            subway_stations = cursor.fetchone()["count"]

            cursor.execute("SELECT last_success FROM feed_status WHERE feed_name = 'vehicles'")
            feed_row = cursor.fetchone()

            cursor.execute("SELECT COUNT(*) AS count FROM demand_snapshots")
            demand_points = cursor.fetchone()["count"]

    freshness = feed_row["last_success"].isoformat() if feed_row and feed_row["last_success"] else "Unknown"
    return OverviewResponse(
        cards=[
            OverviewCard(label="Live Surface Vehicles", value=str(live_vehicles), helper="Bus and streetcar positions"),
            OverviewCard(label="Subway Stations", value=str(subway_stations), helper="Static GTFS schedule coverage"),
            OverviewCard(label="Feed Freshness", value=freshness, helper="Last GTFS-RT vehicle ingest"),
            OverviewCard(label="Demand Snapshots", value=str(demand_points), helper="Simulated crowd analytics"),
        ]
    )


def fetch_alerts() -> AlertsResponse:
    query = """
        SELECT alert_id, header_text, description_text, mode
        FROM service_alerts
        ORDER BY updated_at DESC
        LIMIT 10
    """
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()

    alerts = [
        AlertItem(
            id=row["alert_id"],
            title=row["header_text"] or "Transit alert",
            message=row["description_text"] or "No description available.",
            severity="warning",
            affected_mode=row["mode"] if row["mode"] in {"bus", "streetcar", "subway", "system"} else "system",
        )
        for row in rows
    ]
    return AlertsResponse(alerts=alerts)


def fetch_nearby_stops(latitude: float, longitude: float) -> NearbyStopsResponse:
    query = """
        SELECT
            s.stop_id,
            s.stop_name,
            s.mode,
            ROUND(
                6371000 * acos(
                    LEAST(1.0, GREATEST(-1.0,
                        cos(radians(%(lat)s)) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians(%(lon)s)) +
                        sin(radians(%(lat)s)) * sin(radians(s.latitude))
                    ))
                )
            )::INT AS distance_meters,
            COALESCE(array_agg(DISTINCT COALESCE(r.route_name, stu.route_id)) FILTER (WHERE stu.route_id IS NOT NULL), ARRAY[]::TEXT[]) AS route_names
        FROM stops s
        LEFT JOIN stop_time_updates stu ON stu.stop_id = s.stop_id
        LEFT JOIN routes r ON r.route_id = stu.route_id
        WHERE s.latitude IS NOT NULL AND s.longitude IS NOT NULL
        GROUP BY s.stop_id, s.stop_name, s.mode, s.latitude, s.longitude
        ORDER BY distance_meters ASC
        LIMIT 10
    """
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, {"lat": latitude, "lon": longitude})
            rows = cursor.fetchall()

    stops = [
        NearbyStop(
            stop_id=row["stop_id"],
            stop_name=row["stop_name"],
            route_names=list(row["route_names"]),
            distance_meters=row["distance_meters"],
            mode=row["mode"] if row["mode"] in {"bus", "streetcar", "subway"} else "bus",
        )
        for row in rows
    ]
    return NearbyStopsResponse(latitude=latitude, longitude=longitude, stops=stops)


def fetch_stop_arrivals(stop_id: str) -> ArrivalsResponse:
    query = """
        SELECT
            stu.route_id,
            COALESCE(r.route_name, stu.route_id) AS route_name,
            COALESCE(st.stop_name, stu.stop_id) AS stop_name,
            COALESCE(stu.arrival_time, stu.departure_time) AS next_time,
            COALESCE(vp.congestion_level, 'medium') AS congestion_level
        FROM stop_time_updates stu
        LEFT JOIN routes r ON r.route_id = stu.route_id
        LEFT JOIN stops st ON st.stop_id = stu.stop_id
        LEFT JOIN vehicle_positions vp ON vp.trip_id = stu.trip_id
        WHERE stu.stop_id = %(stop_id)s
          AND COALESCE(stu.arrival_time, stu.departure_time) IS NOT NULL
          AND COALESCE(stu.arrival_time, stu.departure_time) >= NOW() - INTERVAL '2 minutes'
        ORDER BY next_time ASC
        LIMIT 10
    """
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, {"stop_id": stop_id})
            rows = cursor.fetchall()

    now = datetime.now(timezone.utc)
    arrivals = [
        ArrivalItem(
            route_id=row["route_id"] or "",
            route_name=row["route_name"] or row["route_id"] or "Unknown route",
            destination="Live TTC vehicle",
            stop_id=stop_id,
            stop_name=row["stop_name"],
            arrival_in_minutes=max(0, int((row["next_time"] - now).total_seconds() // 60)) if row["next_time"] else 0,
            arrival_type="live",
            mode=_infer_mode(row["route_id"]),
            crowd_level=_normalize_crowd(row["congestion_level"]),
        )
        for row in rows
    ]
    return ArrivalsResponse(arrivals=arrivals)


def fetch_subway_arrivals(station_id: str) -> ArrivalsResponse:
    query = """
        SELECT
            sse.route_id,
            COALESCE(r.route_name, sse.route_id) AS route_name,
            sse.destination,
            sse.arrival_in_minutes,
            COALESCE(st.stop_name, sse.station_id) AS stop_name
        FROM subway_schedule_estimates sse
        LEFT JOIN routes r ON r.route_id = sse.route_id
        LEFT JOIN stops st ON st.stop_id = sse.station_id
        WHERE sse.station_id = %(station_id)s
        ORDER BY sse.arrival_in_minutes ASC NULLS LAST
        LIMIT 10
    """
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, {"station_id": station_id})
            rows = cursor.fetchall()

    arrivals = [
        ArrivalItem(
            route_id=row["route_id"],
            route_name=row["route_name"],
            destination=row["destination"],
            stop_id=station_id,
            stop_name=row["stop_name"],
            arrival_in_minutes=row["arrival_in_minutes"] or 0,
            arrival_type="scheduled",
            mode="subway",
            crowd_level="medium",
        )
        for row in rows
    ]
    return ArrivalsResponse(arrivals=arrivals)


def fetch_rapid_lines() -> RapidLinesResponse:
    query = """
        SELECT route_id, route_name, mode, color
        FROM routes
        WHERE route_id = ANY(%(route_ids)s)
        ORDER BY route_id::INT
    """
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, {"route_ids": list(RAPID_ROUTE_IDS)})
            rows = cursor.fetchall()

    lines = [
        RapidLine(
            route_id=row["route_id"],
            route_name=row["route_name"],
            mode=row["mode"] if row["mode"] in {"subway", "streetcar"} else "streetcar",
            color=row["color"],
        )
        for row in rows
    ]
    return RapidLinesResponse(lines=lines)


def fetch_line_stations(route_id: str) -> LineStationsResponse:
    route_query = "SELECT route_id, route_name, mode, color FROM routes WHERE route_id = %(route_id)s"
    station_query = """
        WITH ranked_trips AS (
            SELECT
                trips.trip_id,
                COUNT(*) AS stop_count,
                ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC, trips.trip_id) AS trip_rank
            FROM trips
            JOIN scheduled_stop_times ON scheduled_stop_times.trip_id = trips.trip_id
            WHERE trips.route_id = %(route_id)s
            GROUP BY trips.trip_id
        ),
        representative_trip AS (
            SELECT trip_id
            FROM ranked_trips
            WHERE trip_rank = 1
        ),
        representative_stations AS (
            SELECT
                COALESCE(platform.parent_station, platform.stop_id) AS station_id,
                COALESCE(parent.stop_name, MIN(platform.stop_name)) AS station_name,
                MIN(scheduled_stop_times.stop_sequence) AS sequence
            FROM scheduled_stop_times
            JOIN representative_trip ON representative_trip.trip_id = scheduled_stop_times.trip_id
            JOIN stops AS platform ON platform.stop_id = scheduled_stop_times.stop_id
            LEFT JOIN stops AS parent ON parent.stop_id = platform.parent_station
            GROUP BY COALESCE(platform.parent_station, platform.stop_id), parent.stop_name
        ),
        station_routes AS (
            SELECT
                COALESCE(platform.parent_station, platform.stop_id) AS station_id,
                ARRAY_AGG(DISTINCT trips.route_id ORDER BY trips.route_id) AS route_ids
            FROM scheduled_stop_times
            JOIN trips ON trips.trip_id = scheduled_stop_times.trip_id
            JOIN stops AS platform ON platform.stop_id = scheduled_stop_times.stop_id
            WHERE trips.route_id = ANY(%(route_ids)s)
            GROUP BY COALESCE(platform.parent_station, platform.stop_id)
        )
        SELECT
            representative_stations.station_id,
            representative_stations.station_name,
            representative_stations.sequence,
            COALESCE(station_routes.route_ids, ARRAY[]::TEXT[]) AS interchange_route_ids
        FROM representative_stations
        LEFT JOIN station_routes ON station_routes.station_id = representative_stations.station_id
        ORDER BY representative_stations.sequence, representative_stations.station_name
    """
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(route_query, {"route_id": route_id})
            route = cursor.fetchone()
            cursor.execute(station_query, {"route_id": route_id, "route_ids": list(RAPID_ROUTE_IDS)})
            rows = cursor.fetchall()

    if not route:
        route = {"route_id": route_id, "route_name": f"Route {route_id}", "mode": "subway", "color": None}

    stations = [
        LineStation(
            station_id=row["station_id"],
            station_name=row["station_name"],
            sequence=row["sequence"],
            interchange_route_ids=list(row["interchange_route_ids"]),
        )
        for row in rows
    ]
    return LineStationsResponse(
        route_id=route["route_id"],
        route_name=route["route_name"],
        mode=route["mode"] if route["mode"] in {"subway", "streetcar"} else "streetcar",
        color=route["color"],
        stations=stations,
    )


def fetch_station_detail(station_id: str) -> StationDetailResponse:
    station_query = """
        WITH station_nodes AS (
            SELECT stop_id, stop_name, parent_station
            FROM stops
            WHERE stop_id = %(station_id)s OR parent_station = %(station_id)s
        )
        SELECT
            COALESCE(parent.stop_name, station.stop_name) AS station_name,
            COALESCE(parent.stop_id, station.stop_id) AS resolved_station_id,
            COALESCE(parent.latitude, station.latitude) AS latitude,
            COALESCE(parent.longitude, station.longitude) AS longitude
        FROM station_nodes station
        LEFT JOIN stops parent ON parent.stop_id = station.parent_station
        LIMIT 1
    """
    rapid_status_query = """
        WITH station_nodes AS (
            SELECT stop_id, parent_station
            FROM stops
            WHERE stop_id = %(station_id)s OR parent_station = %(station_id)s
        )
        SELECT DISTINCT
            routes.route_id,
            routes.route_name,
            CASE WHEN EXISTS (
                SELECT 1 FROM service_alerts sa WHERE routes.route_id = ANY(sa.route_ids)
            ) THEN 'delayed' ELSE 'normal' END AS status,
            CASE WHEN routes.mode IN ('subway', 'streetcar') THEN routes.mode ELSE 'streetcar' END AS mode
        FROM scheduled_stop_times
        JOIN trips ON trips.trip_id = scheduled_stop_times.trip_id
        JOIN routes ON routes.route_id = trips.route_id
        WHERE scheduled_stop_times.stop_id IN (SELECT stop_id FROM station_nodes)
          AND routes.route_id = ANY(%(route_ids)s)
        ORDER BY routes.route_id
    """
    connected_routes_query = """
        WITH anchor AS (
            SELECT %(latitude)s::DOUBLE PRECISION AS latitude, %(longitude)s::DOUBLE PRECISION AS longitude
        ),
        nearby_surface_stops AS (
            SELECT s.stop_id
            FROM stops s, anchor a
            WHERE s.latitude IS NOT NULL
              AND s.longitude IS NOT NULL
              AND s.mode IN ('bus', 'streetcar')
              AND 6371000 * acos(
                    LEAST(1.0, GREATEST(-1.0,
                        cos(radians(a.latitude)) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians(a.longitude)) +
                        sin(radians(a.latitude)) * sin(radians(s.latitude))
                    ))
                  ) <= 500
        ),
        static_routes AS (
            SELECT DISTINCT trips.route_id
            FROM scheduled_stop_times
            JOIN trips ON trips.trip_id = scheduled_stop_times.trip_id
            WHERE scheduled_stop_times.stop_id IN (SELECT stop_id FROM nearby_surface_stops)
        ),
        live_routes AS (
            SELECT DISTINCT stop_time_updates.route_id
            FROM stop_time_updates
            WHERE stop_time_updates.stop_id IN (SELECT stop_id FROM nearby_surface_stops)
        ),
        union_routes AS (
            SELECT route_id FROM static_routes
            UNION
            SELECT route_id FROM live_routes
        ),
        ordered_routes AS (
            SELECT DISTINCT
                routes.route_id,
                routes.route_name,
                CASE WHEN routes.mode IN ('bus', 'streetcar', 'subway') THEN routes.mode ELSE 'bus' END AS mode
            FROM union_routes
            JOIN routes ON routes.route_id = union_routes.route_id
            WHERE routes.route_id <> ALL(%(rapid_route_ids)s)
        )
        SELECT route_id, route_name, mode
        FROM ordered_routes
        ORDER BY mode, route_id
        LIMIT 30
    """

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(station_query, {"station_id": station_id})
            station = cursor.fetchone()
            cursor.execute(rapid_status_query, {"station_id": station_id, "route_ids": list(RAPID_ROUTE_IDS)})
            statuses = cursor.fetchall()
            if station and station["latitude"] is not None and station["longitude"] is not None:
                cursor.execute(
                    connected_routes_query,
                    {
                        "latitude": station["latitude"],
                        "longitude": station["longitude"],
                        "rapid_route_ids": list(RAPID_ROUTE_IDS),
                    },
                )
                connected = cursor.fetchall()
            else:
                connected = []

    line_statuses = [
        StationRouteStatus(
            route_id=row["route_id"],
            route_name=row["route_name"],
            status=row["status"],
            mode=row["mode"],
        )
        for row in statuses
    ]
    connected_routes = [
        ConnectedRoute(
            route_id=row["route_id"],
            route_name=row["route_name"],
            mode=row["mode"],
        )
        for row in connected
    ]

    primary = line_statuses[0] if line_statuses else None
    station_name = station["station_name"] if station else station_id
    resolved_station_id = station["resolved_station_id"] if station else station_id
    return StationDetailResponse(
        station_id=resolved_station_id,
        station_name=station_name,
        primary_route_id=primary.route_id if primary else None,
        primary_route_name=primary.route_name if primary else None,
        connected_routes=connected_routes,
        line_statuses=line_statuses,
    )


def fetch_route_status(route_id: str) -> RouteStatusResponse:
    route_query = "SELECT route_id, route_name, mode, source FROM routes WHERE route_id = %(route_id)s"
    alert_query = "SELECT COUNT(*) AS count FROM service_alerts WHERE %(route_id)s = ANY(route_ids)"

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(route_query, {"route_id": route_id})
            route = cursor.fetchone()
            cursor.execute(alert_query, {"route_id": route_id})
            alert_count = cursor.fetchone()["count"]

    mode = route["mode"] if route and route["mode"] in {"bus", "streetcar", "subway"} else _infer_mode(route_id)
    source = route["source"] if route and route["source"] in {"gtfs_rt", "gtfs_static"} else ("gtfs_static" if mode == "subway" else "gtfs_rt")
    status = "delayed" if alert_count else "normal"

    return RouteStatusResponse(
        route=RouteStatus(
            route_id=route_id,
            route_name=route["route_name"] if route else f"Route {route_id}",
            mode=mode,
            status=status,
            source=source,
        )
    )


def fetch_demand() -> DemandResponse:
    query = "SELECT period, level, note FROM demand_snapshots ORDER BY period"
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()

    demand = [DemandPoint(period=row["period"], level=_normalize_crowd(row["level"]), note=row["note"]) for row in rows]
    return DemandResponse(demand=demand)


def fetch_delays() -> DelaysResponse:
    query = """
        SELECT
            vp.route_id,
            COALESCE(r.route_name, vp.route_id) AS route_name,
            AVG(GREATEST(0, EXTRACT(EPOCH FROM (NOW() - COALESCE(vp.recorded_at, vp.updated_at))) / 60.0)) AS average_delay_minutes
        FROM vehicle_positions vp
        LEFT JOIN routes r ON r.route_id = vp.route_id
        WHERE vp.route_id IS NOT NULL
        GROUP BY vp.route_id, COALESCE(r.route_name, vp.route_id)
        ORDER BY average_delay_minutes DESC
        LIMIT 10
    """
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()

    delays = [
        DelayPoint(
            route_id=row["route_id"],
            route_name=row["route_name"],
            average_delay_minutes=round(float(row["average_delay_minutes"] or 0), 2),
        )
        for row in rows
    ]
    return DelaysResponse(delays=delays)


def _infer_mode(route_id: str | None) -> str:
    streetcar_routes = {"5", "6", "301", "304", "305", "306", "310", "312", "501", "503", "504", "505", "506", "509", "510", "511", "512"}
    if route_id in {"1", "2", "4"}:
        return "subway"
    if route_id in streetcar_routes:
        return "streetcar"
    return "bus"


def _normalize_crowd(level: str | None) -> str:
    if level in {"low", "medium", "high"}:
        return level
    return "medium"
