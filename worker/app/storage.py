from datetime import datetime, timezone
from typing import Any

from app.db import get_connection


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def upsert_routes(routes: list[dict[str, Any]]) -> int:
    if not routes:
        return 0

    query = """
        INSERT INTO routes (route_id, route_name, mode, color, source, updated_at)
        VALUES (%(route_id)s, %(route_name)s, %(mode)s, %(color)s, %(source)s, %(updated_at)s)
        ON CONFLICT (route_id) DO UPDATE SET
            route_name = EXCLUDED.route_name,
            mode = EXCLUDED.mode,
            color = EXCLUDED.color,
            source = EXCLUDED.source,
            updated_at = EXCLUDED.updated_at
    """
    payload = [{**route, "updated_at": utc_now()} for route in routes]
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.executemany(query, payload)
    return len(payload)


def upsert_stops(stops: list[dict[str, Any]]) -> int:
    if not stops:
        return 0

    query = """
        INSERT INTO stops (stop_id, stop_name, latitude, longitude, mode, parent_station, updated_at)
        VALUES (%(stop_id)s, %(stop_name)s, %(latitude)s, %(longitude)s, %(mode)s, %(parent_station)s, %(updated_at)s)
        ON CONFLICT (stop_id) DO UPDATE SET
            stop_name = EXCLUDED.stop_name,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            mode = EXCLUDED.mode,
            parent_station = EXCLUDED.parent_station,
            updated_at = EXCLUDED.updated_at
    """
    payload = [{**stop, "updated_at": utc_now()} for stop in stops]
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.executemany(query, payload)
    return len(payload)


def upsert_trips(trips: list[dict[str, Any]]) -> int:
    if not trips:
        return 0

    query = """
        INSERT INTO trips (
            trip_id, route_id, service_id, trip_headsign, direction_id,
            block_id, shape_id, trip_short_name, mode, updated_at
        )
        VALUES (
            %(trip_id)s, %(route_id)s, %(service_id)s, %(trip_headsign)s, %(direction_id)s,
            %(block_id)s, %(shape_id)s, %(trip_short_name)s, %(mode)s, %(updated_at)s
        )
        ON CONFLICT (trip_id) DO UPDATE SET
            route_id = EXCLUDED.route_id,
            service_id = EXCLUDED.service_id,
            trip_headsign = EXCLUDED.trip_headsign,
            direction_id = EXCLUDED.direction_id,
            block_id = EXCLUDED.block_id,
            shape_id = EXCLUDED.shape_id,
            trip_short_name = EXCLUDED.trip_short_name,
            mode = EXCLUDED.mode,
            updated_at = EXCLUDED.updated_at
    """
    payload = [{**trip, "updated_at": utc_now()} for trip in trips]
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.executemany(query, payload)
    return len(payload)


def replace_scheduled_stop_times(stop_times: list[dict[str, Any]]) -> int:
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("TRUNCATE TABLE scheduled_stop_times")
            if not stop_times:
                return 0
            query = """
                INSERT INTO scheduled_stop_times (
                    trip_id, stop_sequence, stop_id, arrival_time_seconds, departure_time_seconds, updated_at
                )
                VALUES (
                    %(trip_id)s, %(stop_sequence)s, %(stop_id)s, %(arrival_time_seconds)s, %(departure_time_seconds)s, %(updated_at)s
                )
            """
            payload = [{**row, "updated_at": utc_now()} for row in stop_times]
            cursor.executemany(query, payload)
    return len(stop_times)


def replace_service_calendars(calendars: list[dict[str, Any]]) -> int:
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("TRUNCATE TABLE service_calendars")
            if not calendars:
                return 0
            query = """
                INSERT INTO service_calendars (
                    service_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday,
                    start_date, end_date, updated_at
                )
                VALUES (
                    %(service_id)s, %(monday)s, %(tuesday)s, %(wednesday)s, %(thursday)s, %(friday)s, %(saturday)s, %(sunday)s,
                    %(start_date)s, %(end_date)s, %(updated_at)s
                )
            """
            payload = [{**row, "updated_at": utc_now()} for row in calendars]
            cursor.executemany(query, payload)
    return len(calendars)


def replace_service_exceptions(exceptions: list[dict[str, Any]]) -> int:
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("TRUNCATE TABLE service_exceptions")
            if not exceptions:
                return 0
            query = """
                INSERT INTO service_exceptions (service_id, service_date, exception_type, updated_at)
                VALUES (%(service_id)s, %(service_date)s, %(exception_type)s, %(updated_at)s)
            """
            payload = [{**row, "updated_at": utc_now()} for row in exceptions]
            cursor.executemany(query, payload)
    return len(exceptions)


def replace_subway_schedule_estimates(estimates: list[dict[str, Any]]) -> int:
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("TRUNCATE TABLE subway_schedule_estimates")
            if not estimates:
                return 0
            query = """
                INSERT INTO subway_schedule_estimates (
                    station_id, route_id, destination, arrival_time, arrival_in_minutes, updated_at
                )
                VALUES (
                    %(station_id)s, %(route_id)s, %(destination)s, %(arrival_time)s, %(arrival_in_minutes)s, %(updated_at)s
                )
            """
            payload = [{**estimate, "updated_at": utc_now()} for estimate in estimates]
            cursor.executemany(query, payload)
    return len(estimates)


def upsert_vehicle_positions(vehicles: list[dict[str, Any]]) -> int:
    if not vehicles:
        return 0

    query = """
        INSERT INTO vehicle_positions (
            vehicle_id, route_id, trip_id, stop_id, latitude, longitude, bearing,
            speed, occupancy_status, congestion_level, recorded_at, updated_at
        )
        VALUES (
            %(vehicle_id)s, %(route_id)s, %(trip_id)s, %(stop_id)s, %(latitude)s, %(longitude)s, %(bearing)s,
            %(speed)s, %(occupancy_status)s, %(congestion_level)s, %(recorded_at)s, %(updated_at)s
        )
        ON CONFLICT (vehicle_id) DO UPDATE SET
            route_id = EXCLUDED.route_id,
            trip_id = EXCLUDED.trip_id,
            stop_id = EXCLUDED.stop_id,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            bearing = EXCLUDED.bearing,
            speed = EXCLUDED.speed,
            occupancy_status = EXCLUDED.occupancy_status,
            congestion_level = EXCLUDED.congestion_level,
            recorded_at = EXCLUDED.recorded_at,
            updated_at = EXCLUDED.updated_at
    """
    payload = [{**vehicle, "updated_at": utc_now()} for vehicle in vehicles if vehicle.get("vehicle_id")]
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.executemany(query, payload)
    return len(payload)


def replace_stop_time_updates(stop_updates: list[dict[str, Any]]) -> int:
    # GTFS-RT stop time updates are a rolling snapshot, not long-term history.
    # Replacing the table each ingest keeps arrivals fresh and prevents bloat.
    payload = [{**row, "updated_at": utc_now()} for row in stop_updates if row.get("stop_id")]
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("TRUNCATE TABLE stop_time_updates")
            if not payload:
                return 0
            query = """
                INSERT INTO stop_time_updates (
                    trip_id, stop_id, route_id, vehicle_id, stop_sequence,
                    arrival_time, departure_time, schedule_relationship, updated_at
                )
                VALUES (
                    %(trip_id)s, %(stop_id)s, %(route_id)s, %(vehicle_id)s, %(stop_sequence)s,
                    %(arrival_time)s, %(departure_time)s, %(schedule_relationship)s, %(updated_at)s
                )
            """
            cursor.executemany(query, payload)
    return len(payload)


def replace_alerts(alerts: list[dict[str, Any]]) -> int:
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM service_alerts")
            if not alerts:
                return 0
            query = """
                INSERT INTO service_alerts (
                    alert_id, header_text, description_text, cause, effect,
                    route_ids, stop_ids, mode, active_period_start, active_period_end, updated_at
                )
                VALUES (
                    %(alert_id)s, %(header_text)s, %(description_text)s, %(cause)s, %(effect)s,
                    %(route_ids)s, %(stop_ids)s, %(mode)s, %(active_period_start)s, %(active_period_end)s, %(updated_at)s
                )
            """
            payload = [{**alert, "updated_at": utc_now()} for alert in alerts if alert.get("alert_id")]
            cursor.executemany(query, payload)
    return len(alerts)


def replace_demand_snapshots(snapshots: list[dict[str, Any]]) -> int:
    if not snapshots:
        return 0

    query = """
        INSERT INTO demand_snapshots (period, mode, level, note, updated_at)
        VALUES (%(period)s, %(mode)s, %(level)s, %(note)s, %(updated_at)s)
        ON CONFLICT (period, mode) DO UPDATE SET
            level = EXCLUDED.level,
            note = EXCLUDED.note,
            updated_at = EXCLUDED.updated_at
    """
    payload = [{**snapshot, "updated_at": utc_now()} for snapshot in snapshots]
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.executemany(query, payload)
    return len(payload)


def mark_feed_success(feed_name: str, entity_count: int) -> None:
    _upsert_feed_status(feed_name=feed_name, entity_count=entity_count, last_error=None, last_success=utc_now())


def mark_feed_failure(feed_name: str, error: str) -> None:
    _upsert_feed_status(feed_name=feed_name, entity_count=0, last_error=error, last_success=None)


def _upsert_feed_status(feed_name: str, entity_count: int, last_error: str | None, last_success: datetime | None) -> None:
    query = """
        INSERT INTO feed_status (feed_name, last_success, last_attempt, last_error, entity_count, updated_at)
        VALUES (%(feed_name)s, %(last_success)s, %(last_attempt)s, %(last_error)s, %(entity_count)s, %(updated_at)s)
        ON CONFLICT (feed_name) DO UPDATE SET
            last_success = COALESCE(EXCLUDED.last_success, feed_status.last_success),
            last_attempt = EXCLUDED.last_attempt,
            last_error = EXCLUDED.last_error,
            entity_count = EXCLUDED.entity_count,
            updated_at = EXCLUDED.updated_at
    """
    now = utc_now()
    payload = {
        "feed_name": feed_name,
        "last_success": last_success,
        "last_attempt": now,
        "last_error": last_error,
        "entity_count": entity_count,
        "updated_at": now,
    }
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, payload)

