# Database README

## Purpose

The database layer stores processed TTC transit data for both the backend and the worker. Supabase Postgres is the system of record.

The database supports:

- live bus and streetcar positions
- live trip updates and arrivals
- TTC service alerts
- static GTFS routes, stops, trips, and stop times
- generated subway schedule estimates
- simulated demand snapshots
- feed health tracking

## Current Deployment

Database host:

- Supabase Postgres

Application access pattern:

- backend connects directly using `DATABASE_URL`
- worker connects directly using `DATABASE_URL`
- frontend does not connect directly to Supabase

## Schema Files

Run these files in order:

1. `infra/postgres/init/001_schema.sql`
2. `infra/postgres/init/002_static_gtfs.sql`

`001_schema.sql` sets up live-data and dashboard tables.

`002_static_gtfs.sql` adds static GTFS and subway schedule support.

## Main Tables

### Live operational data

- `vehicle_positions`
- `stop_time_updates`
- `service_alerts`
- `feed_status`

### Static GTFS data

- `routes`
- `stops`
- `trips`
- `scheduled_stop_times`
- `service_calendars`
- `service_exceptions`

### Derived application data

- `subway_schedule_estimates`
- `demand_snapshots`

## Setup

### 1. Create the database

Provision a Supabase project and obtain a Postgres connection string.

Use the session-pooler string for hosted services.

### 2. Apply schema

In Supabase SQL Editor, run:

- `001_schema.sql`
- `002_static_gtfs.sql`

### 3. Load data

Use the worker to populate the database:

```powershell
Set-Location "E:\School\Winter term\COE 892\public-transit-project\worker"
& ..\.venv\Scripts\python.exe -m app.main static
& ..\.venv\Scripts\python.exe -m app.main live
```

## Security

The database must not be exposed directly to the browser.

Required controls for this project:

- enable RLS on public app tables
- do not expose `DATABASE_URL` in frontend code
- use backend API as the only public access layer

RLS enable statements:

```sql
alter table if exists public.routes enable row level security;
alter table if exists public.stops enable row level security;
alter table if exists public.trips enable row level security;
alter table if exists public.scheduled_stop_times enable row level security;
alter table if exists public.service_calendars enable row level security;
alter table if exists public.service_exceptions enable row level security;
alter table if exists public.vehicle_positions enable row level security;
alter table if exists public.stop_time_updates enable row level security;
alter table if exists public.service_alerts enable row level security;
alter table if exists public.subway_schedule_estimates enable row level security;
alter table if exists public.demand_snapshots enable row level security;
alter table if exists public.feed_status enable row level security;
```

## Storage Management

The primary growth risks are:

- `stop_time_updates`
- `scheduled_stop_times`
- `trips`

Current mitigation already implemented in code:

- live worker replaces `stop_time_updates` instead of appending forever

If manual cleanup is required:

```sql
truncate table public.stop_time_updates;
```

Then trigger the live worker again.

## Verification Queries

### Table sizes

```sql
select
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(format('%I.%I', schemaname, tablename)::regclass)) as total_size
from pg_tables
where schemaname = 'public'
order by pg_total_relation_size(format('%I.%I', schemaname, tablename)::regclass) desc;
```

### RLS status

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

## How the Database Fits the System

1. worker fetches TTC live and static feed data
2. worker parses and writes normalized rows to Supabase
3. backend queries Supabase and serves REST responses
4. frontend renders backend responses

## Ownership Notes

Database is responsible for:

- persistence
- queryable normalized data
- derived transit schedule storage
- feed health records

Database is not responsible for:

- frontend rendering
- HTTP routing
- TTC feed parsing logic
