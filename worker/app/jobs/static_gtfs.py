from app.services.static_gtfs import import_static_gtfs


def run_static_import_safe() -> dict[str, int]:
    result = import_static_gtfs()
    return {
        "routes": result.routes,
        "stops": result.stops,
        "trips": result.trips,
        "scheduled_stop_times": result.scheduled_stop_times,
        "service_calendars": result.service_calendars,
        "service_exceptions": result.service_exceptions,
        "subway_schedule_estimates": result.subway_schedule_estimates,
    }
