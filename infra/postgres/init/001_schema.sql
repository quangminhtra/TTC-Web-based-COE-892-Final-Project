CREATE TABLE IF NOT EXISTS routes (
    route_id TEXT PRIMARY KEY,
    route_name TEXT NOT NULL,
    mode TEXT NOT NULL,
    color TEXT,
    source TEXT NOT NULL DEFAULT 'unknown',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stops (
    stop_id TEXT PRIMARY KEY,
    stop_name TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    mode TEXT NOT NULL DEFAULT 'bus',
    parent_station TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicle_positions (
    vehicle_id TEXT PRIMARY KEY,
    route_id TEXT,
    trip_id TEXT,
    stop_id TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    bearing DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    occupancy_status TEXT,
    congestion_level TEXT,
    recorded_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stop_time_updates (
    trip_id TEXT NOT NULL,
    stop_id TEXT NOT NULL,
    route_id TEXT,
    vehicle_id TEXT,
    stop_sequence INTEGER NOT NULL DEFAULT 0,
    arrival_time TIMESTAMPTZ,
    departure_time TIMESTAMPTZ,
    schedule_relationship TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (trip_id, stop_id, stop_sequence)
);

CREATE TABLE IF NOT EXISTS service_alerts (
    alert_id TEXT PRIMARY KEY,
    header_text TEXT,
    description_text TEXT,
    cause TEXT,
    effect TEXT,
    route_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    stop_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    mode TEXT NOT NULL DEFAULT 'system',
    active_period_start TIMESTAMPTZ,
    active_period_end TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subway_schedule_estimates (
    station_id TEXT NOT NULL,
    route_id TEXT NOT NULL,
    destination TEXT NOT NULL,
    arrival_time TIMESTAMPTZ,
    arrival_in_minutes INTEGER,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (station_id, route_id, destination)
);

CREATE TABLE IF NOT EXISTS demand_snapshots (
    period TEXT NOT NULL,
    mode TEXT NOT NULL,
    level TEXT NOT NULL,
    note TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (period, mode)
);

CREATE TABLE IF NOT EXISTS feed_status (
    feed_name TEXT PRIMARY KEY,
    last_success TIMESTAMPTZ,
    last_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_error TEXT,
    entity_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stops_lat_lon ON stops (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_stop_time_updates_stop_id ON stop_time_updates (stop_id, arrival_time);
CREATE INDEX IF NOT EXISTS idx_service_alerts_updated_at ON service_alerts (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_positions_route_id ON vehicle_positions (route_id);
