from __future__ import annotations

import csv
import io
import zipfile
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

import httpx

from app.config import settings
from app.db import get_connection
from app.storage import (
    replace_service_calendars,
    replace_service_exceptions,
    replace_subway_schedule_estimates,
    replace_scheduled_stop_times,
    upsert_routes,
    upsert_stops,
    upsert_trips,
)

TORONTO_TZ = ZoneInfo("America/Toronto")
DEFAULT_STATIC_GTFS_URL = "https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/7795b45e-e65a-4465-81fc-c36b9dfff169/resource/cfb6b2b8-6191-41e3-bda1-b175c51148cb/download/TTC%20Routes%20and%20Schedules%20Data.zip"


@dataclass(frozen=True)
class StaticImportResult:
    routes: int
    stops: int
    trips: int
    scheduled_stop_times: int
    service_calendars: int
    service_exceptions: int
    subway_schedule_estimates: int


def import_static_gtfs() -> StaticImportResult:
    archive = _download_static_feed()
    tables = _read_gtfs_tables(archive)

    routes = _parse_routes(tables["routes.txt"])
    trips = _parse_trips(tables["trips.txt"], routes)
    stop_times = _parse_stop_times(tables["stop_times.txt"])
    calendars = _parse_calendars(tables.get("calendar.txt", []))
    exceptions = _parse_calendar_dates(tables.get("calendar_dates.txt", []))
    stops = _parse_stops(tables["stops.txt"], stop_times, trips)

    upsert_routes(routes)
    upsert_stops(stops)
    upsert_trips(trips)
    replace_scheduled_stop_times(stop_times)
    replace_service_calendars(calendars)
    replace_service_exceptions(exceptions)
    estimates = refresh_subway_schedule_estimates()

    return StaticImportResult(
        routes=len(routes),
        stops=len(stops),
        trips=len(trips),
        scheduled_stop_times=len(stop_times),
        service_calendars=len(calendars),
        service_exceptions=len(exceptions),
        subway_schedule_estimates=estimates,
    )


def refresh_subway_schedule_estimates() -> int:
    now = datetime.now(TORONTO_TZ)
    window_end = now + timedelta(hours=6)

    today = now.date()
    yesterday = today - timedelta(days=1)
    tomorrow = today + timedelta(days=1)

    today_services = _active_service_ids(today)
    yesterday_services = _active_service_ids(yesterday)
    tomorrow_services = _active_service_ids(tomorrow)

    estimates = []
    estimates.extend(_build_subway_estimates_for_service_date(today, today_services, now, window_end))
    estimates.extend(_build_subway_estimates_for_service_date(yesterday, yesterday_services, now, window_end))
    estimates.extend(_build_subway_estimates_for_service_date(tomorrow, tomorrow_services, now, window_end))

    deduped: dict[tuple[str, str, str], dict[str, object]] = {}
    for estimate in estimates:
        key = (estimate["station_id"], estimate["route_id"], estimate["destination"])
        existing = deduped.get(key)
        if not existing or estimate["arrival_time"] < existing["arrival_time"]:
            deduped[key] = estimate

    return replace_subway_schedule_estimates(list(deduped.values()))


def _download_static_feed() -> bytes:
    source_url = settings.static_gtfs_url or DEFAULT_STATIC_GTFS_URL
    response = httpx.get(source_url, timeout=60.0)
    response.raise_for_status()
    return response.content


def _read_gtfs_tables(archive_bytes: bytes) -> dict[str, list[dict[str, str]]]:
    with zipfile.ZipFile(io.BytesIO(archive_bytes)) as archive:
        return {
            name: list(csv.DictReader(io.TextIOWrapper(archive.open(name), encoding="utf-8-sig")))
            for name in archive.namelist()
            if name.endswith(".txt")
        }


def _parse_routes(rows: list[dict[str, str]]) -> list[dict[str, object]]:
    routes = []
    for row in rows:
        route_id = row.get("route_id")
        if not route_id:
            continue
        routes.append(
            {
                "route_id": route_id,
                "route_name": row.get("route_long_name") or row.get("route_short_name") or route_id,
                "mode": _mode_from_route_type(row.get("route_type")),
                "color": row.get("route_color") or None,
                "source": "gtfs_static",
            }
        )
    return routes


def _parse_trips(rows: list[dict[str, str]], routes: list[dict[str, object]]) -> list[dict[str, object]]:
    route_modes = {route["route_id"]: route["mode"] for route in routes}
    trips = []
    for row in rows:
        trip_id = row.get("trip_id")
        route_id = row.get("route_id")
        service_id = row.get("service_id")
        if not trip_id or not route_id or not service_id:
            continue
        trips.append(
            {
                "trip_id": trip_id,
                "route_id": route_id,
                "service_id": service_id,
                "trip_headsign": row.get("trip_headsign") or None,
                "direction_id": _int_or_none(row.get("direction_id")),
                "block_id": row.get("block_id") or None,
                "shape_id": row.get("shape_id") or None,
                "trip_short_name": row.get("trip_short_name") or None,
                "mode": route_modes.get(route_id, "bus"),
            }
        )
    return trips


def _parse_stop_times(rows: list[dict[str, str]]) -> list[dict[str, object]]:
    parsed = []
    for row in rows:
        trip_id = row.get("trip_id")
        stop_id = row.get("stop_id")
        stop_sequence = _int_or_none(row.get("stop_sequence"))
        if not trip_id or not stop_id or stop_sequence is None:
            continue
        parsed.append(
            {
                "trip_id": trip_id,
                "stop_sequence": stop_sequence,
                "stop_id": stop_id,
                "arrival_time_seconds": _gtfs_time_to_seconds(row.get("arrival_time")),
                "departure_time_seconds": _gtfs_time_to_seconds(row.get("departure_time")),
            }
        )
    return parsed


def _parse_calendars(rows: list[dict[str, str]]) -> list[dict[str, object]]:
    calendars = []
    for row in rows:
        service_id = row.get("service_id")
        if not service_id:
            continue
        calendars.append(
            {
                "service_id": service_id,
                "monday": row.get("monday") == "1",
                "tuesday": row.get("tuesday") == "1",
                "wednesday": row.get("wednesday") == "1",
                "thursday": row.get("thursday") == "1",
                "friday": row.get("friday") == "1",
                "saturday": row.get("saturday") == "1",
                "sunday": row.get("sunday") == "1",
                "start_date": _parse_service_date(row.get("start_date")),
                "end_date": _parse_service_date(row.get("end_date")),
            }
        )
    return calendars


def _parse_calendar_dates(rows: list[dict[str, str]]) -> list[dict[str, object]]:
    exceptions = []
    for row in rows:
        service_id = row.get("service_id")
        service_date = _parse_service_date(row.get("date"))
        exception_type = _int_or_none(row.get("exception_type"))
        if not service_id or not service_date or exception_type is None:
            continue
        exceptions.append(
            {
                "service_id": service_id,
                "service_date": service_date,
                "exception_type": exception_type,
            }
        )
    return exceptions


def _parse_stops(rows: list[dict[str, str]], stop_times: list[dict[str, object]], trips: list[dict[str, object]]) -> list[dict[str, object]]:
    trip_modes = {trip["trip_id"]: trip["mode"] for trip in trips}
    stop_modes: dict[str, set[str]] = defaultdict(set)
    for stop_time in stop_times:
        mode = trip_modes.get(stop_time["trip_id"])
        if mode:
            stop_modes[stop_time["stop_id"]].add(mode)

    raw_stops = {row.get("stop_id"): row for row in rows if row.get("stop_id")}
    for stop_id, modes in list(stop_modes.items()):
        parent_station = raw_stops.get(stop_id, {}).get("parent_station")
        if parent_station:
            stop_modes[parent_station].update(modes)

    stops = []
    for row in rows:
        stop_id = row.get("stop_id")
        if not stop_id:
            continue
        inferred_modes = stop_modes.get(stop_id, set())
        stops.append(
            {
                "stop_id": stop_id,
                "stop_name": row.get("stop_name") or stop_id,
                "latitude": _float_or_none(row.get("stop_lat")),
                "longitude": _float_or_none(row.get("stop_lon")),
                "mode": _dominant_mode(inferred_modes),
                "parent_station": row.get("parent_station") or None,
            }
        )
    return stops


def _active_service_ids(service_date: date) -> set[str]:
    weekday_column = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"][service_date.weekday()]
    active: set[str] = set()
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT service_id
                FROM service_calendars
                WHERE {weekday_column} = TRUE
                  AND start_date <= %(service_date)s
                  AND end_date >= %(service_date)s
                """,
                {"service_date": service_date},
            )
            active.update(row[0] for row in cursor.fetchall())

            cursor.execute(
                """
                SELECT service_id, exception_type
                FROM service_exceptions
                WHERE service_date = %(service_date)s
                """,
                {"service_date": service_date},
            )
            for service_id, exception_type in cursor.fetchall():
                if exception_type == 1:
                    active.add(service_id)
                elif exception_type == 2:
                    active.discard(service_id)
    return active


def _build_subway_estimates_for_service_date(
    service_date: date,
    service_ids: set[str],
    now: datetime,
    window_end: datetime,
) -> list[dict[str, object]]:
    if not service_ids:
        return []

    query = """
        SELECT
            COALESCE(platform.parent_station, platform.stop_id) AS station_id,
            trips.route_id,
            COALESCE(trips.trip_headsign, trips.trip_short_name, trips.route_id) AS destination,
            scheduled_stop_times.arrival_time_seconds,
            scheduled_stop_times.departure_time_seconds
        FROM scheduled_stop_times
        JOIN trips ON trips.trip_id = scheduled_stop_times.trip_id
        JOIN stops AS platform ON platform.stop_id = scheduled_stop_times.stop_id
        WHERE trips.mode = 'subway'
          AND trips.service_id = ANY(%(service_ids)s)
    """
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, {"service_ids": list(service_ids)})
            rows = cursor.fetchall()

    service_start = datetime.combine(service_date, time.min, tzinfo=TORONTO_TZ)
    estimates = []
    for station_id, route_id, destination, arrival_seconds, departure_seconds in rows:
        schedule_seconds = arrival_seconds if arrival_seconds is not None else departure_seconds
        if schedule_seconds is None:
            continue
        arrival_time = service_start + timedelta(seconds=schedule_seconds)
        if arrival_time < now or arrival_time > window_end:
            continue
        estimates.append(
            {
                "station_id": station_id,
                "route_id": route_id,
                "destination": destination,
                "arrival_time": arrival_time.astimezone(ZoneInfo("UTC")),
                "arrival_in_minutes": max(0, int((arrival_time - now).total_seconds() // 60)),
            }
        )
    return estimates


def _mode_from_route_type(route_type: str | None) -> str:
    if route_type == "1":
        return "subway"
    if route_type in {"0", "900"}:
        return "streetcar"
    return "bus"


def _dominant_mode(modes: set[str]) -> str:
    if "subway" in modes:
        return "subway"
    if "streetcar" in modes:
        return "streetcar"
    if "bus" in modes:
        return "bus"
    return "bus"


def _gtfs_time_to_seconds(value: str | None) -> int | None:
    if not value:
        return None
    parts = value.split(":")
    if len(parts) != 3:
        return None
    hours, minutes, seconds = (int(part) for part in parts)
    return hours * 3600 + minutes * 60 + seconds


def _parse_service_date(value: str | None) -> date | None:
    if not value:
        return None
    return datetime.strptime(value, "%Y%m%d").date()


def _int_or_none(value: str | None) -> int | None:
    if value in (None, ""):
        return None
    return int(value)


def _float_or_none(value: str | None) -> float | None:
    if value in (None, ""):
        return None
    return float(value)
