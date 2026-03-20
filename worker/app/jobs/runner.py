import time
from datetime import datetime, timezone

from app.config import settings
from app.jobs.static_gtfs import run_static_import_safe
from app.services.demand import generate_demand_snapshots
from app.services.static_gtfs import refresh_subway_schedule_estimates
from app.parsers.gtfs_rt import parse_alerts, parse_trip_updates, parse_vehicle_positions
from app.services.ttc import fetch_all_feeds
from app.storage import (
    mark_feed_failure,
    mark_feed_success,
    replace_alerts,
    replace_demand_snapshots,
    upsert_routes,
    upsert_stop_time_updates,
    upsert_vehicle_positions,
)


def run_once() -> dict[str, object]:
    feeds = fetch_all_feeds()

    vehicles = parse_vehicle_positions(feeds["vehicles"])
    routes, stop_updates = parse_trip_updates(feeds["trips"])
    alerts = parse_alerts(feeds["alerts"])
    demand = [
        {"period": snapshot.period, "mode": "system", "level": snapshot.level, "note": snapshot.note}
        for snapshot in generate_demand_snapshots()
    ]

    counts = {
        "routes": upsert_routes(routes),
        "vehicles": upsert_vehicle_positions(vehicles),
        "stop_updates": upsert_stop_time_updates(stop_updates),
        "alerts": replace_alerts(alerts),
        "demand_snapshots": replace_demand_snapshots(demand),
        "subway_schedule_estimates": refresh_subway_schedule_estimates(),
    }

    mark_feed_success("vehicles", counts["vehicles"])
    mark_feed_success("trips", counts["stop_updates"])
    mark_feed_success("alerts", counts["alerts"])

    return counts


def run_once_safe() -> dict[str, object]:
    try:
        return run_once()
    except Exception as exc:
        error_text = str(exc)
        for feed_name in ("vehicles", "trips", "alerts"):
            mark_feed_failure(feed_name, error_text)
        raise


def run_forever_safe() -> None:
    interval = max(settings.poll_interval_seconds, 5)
    while True:
        started_at = datetime.now(timezone.utc).isoformat()
        try:
            counts = run_once_safe()
            print(f"[{started_at}] ingest ok: {counts}", flush=True)
        except Exception as exc:
            print(f"[{started_at}] ingest failed: {exc}", flush=True)
        time.sleep(interval)
