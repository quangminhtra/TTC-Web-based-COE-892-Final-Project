from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from google.transit import gtfs_realtime_pb2


STREETCAR_ROUTES = {"301", "304", "305", "306", "310", "312", "501", "503", "504", "505", "506", "509", "510", "511", "512"}


def parse_feed(payload: bytes) -> gtfs_realtime_pb2.FeedMessage:
    message = gtfs_realtime_pb2.FeedMessage()
    message.ParseFromString(payload)
    return message


def parse_vehicle_positions(payload: bytes) -> list[dict[str, Any]]:
    message = parse_feed(payload)
    results: list[dict[str, Any]] = []

    for entity in message.entity:
        if not entity.HasField("vehicle"):
            continue

        vehicle = entity.vehicle
        trip = vehicle.trip
        position = vehicle.position
        results.append(
            {
                "vehicle_id": vehicle.vehicle.id or entity.id,
                "route_id": trip.route_id or None,
                "trip_id": trip.trip_id or None,
                "stop_id": vehicle.stop_id or None,
                "latitude": position.latitude if vehicle.HasField("position") else None,
                "longitude": position.longitude if vehicle.HasField("position") else None,
                "bearing": position.bearing if vehicle.HasField("position") and position.HasField("bearing") else None,
                "speed": position.speed if vehicle.HasField("position") and position.HasField("speed") else None,
                "occupancy_status": _enum_name(vehicle, "occupancy_status"),
                "congestion_level": _congestion_from_occupancy(_enum_name(vehicle, "occupancy_status")),
                "recorded_at": _timestamp(vehicle.timestamp),
            }
        )

    return results


def parse_trip_updates(payload: bytes) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    message = parse_feed(payload)
    routes: dict[str, dict[str, Any]] = {}
    stop_updates: list[dict[str, Any]] = []

    for entity in message.entity:
        if not entity.HasField("trip_update"):
            continue

        trip_update = entity.trip_update
        trip = trip_update.trip
        vehicle = trip_update.vehicle
        route_id = trip.route_id or None
        if route_id:
            routes[route_id] = {
                "route_id": route_id,
                "route_name": _route_name(route_id),
                "mode": _mode_for_route(route_id),
                "color": None,
                "source": "gtfs_rt",
            }

        for stop_time_update in trip_update.stop_time_update:
            stop_updates.append(
                {
                    "trip_id": trip.trip_id or entity.id,
                    "stop_id": stop_time_update.stop_id or "",
                    "route_id": route_id,
                    "vehicle_id": vehicle.id or None,
                    "stop_sequence": stop_time_update.stop_sequence or 0,
                    "arrival_time": _stop_timestamp(stop_time_update, "arrival"),
                    "departure_time": _stop_timestamp(stop_time_update, "departure"),
                    "schedule_relationship": _enum_name(stop_time_update, "schedule_relationship"),
                }
            )

    return list(routes.values()), stop_updates


def parse_alerts(payload: bytes) -> list[dict[str, Any]]:
    message = parse_feed(payload)
    alerts: list[dict[str, Any]] = []

    for entity in message.entity:
        if not entity.HasField("alert"):
            continue

        alert = entity.alert
        route_ids = sorted({informed.route_id for informed in alert.informed_entity if informed.route_id})
        stop_ids = sorted({informed.stop_id for informed in alert.informed_entity if informed.stop_id})
        active_period = alert.active_period[0] if alert.active_period else None
        alerts.append(
            {
                "alert_id": entity.id,
                "header_text": _translated_text(alert.header_text),
                "description_text": _translated_text(alert.description_text),
                "cause": _enum_name(alert, "cause"),
                "effect": _enum_name(alert, "effect"),
                "route_ids": route_ids,
                "stop_ids": stop_ids,
                "mode": _mode_from_entities(route_ids),
                "active_period_start": _timestamp(active_period.start) if active_period and active_period.HasField("start") else None,
                "active_period_end": _timestamp(active_period.end) if active_period and active_period.HasField("end") else None,
            }
        )

    return alerts


def _translated_text(value: Any) -> str | None:
    if not value.translation:
        return None
    return value.translation[0].text or None


def _timestamp(value: int | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromtimestamp(value, tz=timezone.utc)


def _stop_timestamp(stop_time_update: Any, field_name: str) -> datetime | None:
    if not stop_time_update.HasField(field_name):
        return None
    event = getattr(stop_time_update, field_name)
    if not event.HasField("time"):
        return None
    return _timestamp(event.time)


def _enum_name(message: Any, field_name: str) -> str | None:
    if not message.HasField(field_name):
        return None
    enum_value = getattr(message, field_name)
    enum_descriptor = message.DESCRIPTOR.fields_by_name[field_name].enum_type
    return enum_descriptor.values_by_number[enum_value].name.lower()


def _route_name(route_id: str) -> str:
    return f"Route {route_id}"


def _mode_for_route(route_id: str) -> str:
    if route_id in {"1", "2", "4"}:
        return "subway"
    if route_id in STREETCAR_ROUTES:
        return "streetcar"
    return "bus"


def _mode_from_entities(route_ids: list[str]) -> str:
    if not route_ids:
        return "system"
    modes = {_mode_for_route(route_id) for route_id in route_ids}
    if len(modes) == 1:
        return next(iter(modes))
    return "system"


def _congestion_from_occupancy(occupancy_status: str | None) -> str:
    if occupancy_status in {"many_seats_available", "few_seats_available", "standing_room_only"}:
        return "medium"
    if occupancy_status in {"full", "crushed_standing_room_only", "not_accepting_passengers"}:
        return "high"
    return "low"
