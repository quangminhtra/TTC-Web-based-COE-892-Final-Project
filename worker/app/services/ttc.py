import httpx

from app.config import settings


def fetch_feed(url: str) -> bytes:
    response = httpx.get(url, timeout=20.0)
    response.raise_for_status()
    return response.content


def fetch_all_feeds() -> dict[str, bytes]:
    return {
        "vehicles": fetch_feed(settings.gtfs_rt_vehicle_url),
        "trips": fetch_feed(settings.gtfs_rt_trip_url),
        "alerts": fetch_feed(settings.gtfs_rt_alert_url),
    }
