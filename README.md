# TTC Web Based COE 892 Final Project

Distributed public transit system for TTC live monitoring, subway schedule reference, connected surface routes, and demand analytics.

Deployed frontend:
- https://ttc-app-tmu.web.app/

## Project Overview

This project is organized into four runtime parts:

- `frontend/`
  - React + Vite single-page application
- `backend/`
  - FastAPI REST API
- `worker/`
  - TTC GTFS-Realtime and static GTFS ingestion jobs
- `infra/`
  - SQL schema files for Supabase Postgres

Production architecture uses:

- Firebase Hosting for the frontend
- Render for the backend API
- GitHub Actions for scheduled worker execution
- Supabase Postgres for persistent storage

## What the System Does

The system ingests official TTC data and exposes it through a web dashboard.

Implemented features:

- dashboard overview cards
- TTC service alerts
- rapid line status cards
- nearby stops and station lookup
- stop arrival board
- rapid transit line pages
- station detail pages
- connected bus/streetcar route lookup near selected stations
- scheduled subway arrival estimates
- demand and delay analytics

Important current behavior:

- subway arrivals are shown as scheduled estimates, not live TTC subway prediction data
- connected surface routes are listed near the station, but the station detail page does not show bus/streetcar arrival times for each connected route

## Repository Structure

- `frontend/`: React + Vite frontend
- `backend/`: FastAPI backend
- `worker/`: ingestion and schedule-generation jobs
- `infra/`: SQL initialization files
- `render.yaml`: Render backend deployment config
- `.github/workflows/ttc-live-worker.yml`: scheduled live worker
- `.github/workflows/ttc-static-refresh.yml`: scheduled static GTFS refresh

## Prerequisites

Install these before running the project:

- Python 3.13+
- Node.js 18+ and npm
- Git
- a Supabase project with a valid Postgres `DATABASE_URL`

Optional:

- Firebase CLI for deployment

## Environment Files

Create these local files and do not commit them:

- `frontend/.env`
- `backend/.env`
- `worker/.env`

Templates already exist in the repository:

- `frontend/.env.example`
- `backend/.env.example`
- `worker/.env.example`

### frontend/.env

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

### backend/.env

```env
APP_NAME=TTC Transit API
ENVIRONMENT=development
API_PREFIX=/api
DATABASE_URL=postgresql://...
```

### worker/.env

```env
ENVIRONMENT=development
GTFS_RT_VEHICLE_URL=https://bustime.ttc.ca/gtfsrt/vehicles
GTFS_RT_TRIP_URL=https://bustime.ttc.ca/gtfsrt/trips
GTFS_RT_ALERT_URL=https://bustime.ttc.ca/gtfsrt/alerts
STATIC_GTFS_URL=https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/7795b45e-e65a-4465-81fc-c36b9dfff169/resource/cfb6b2b8-6191-41e3-bda1-b175c51148cb/download/TTC%20Routes%20and%20Schedules%20Data.zip
POLL_INTERVAL_SECONDS=30
DATABASE_URL=postgresql://...
```

Use the Supabase session-pooler connection string for hosted environments.

If you need the Supabase database password, `DATABASE_URL`, or Render deployment access details, contact `qminh30k3@gmail.com`.

## Initial Database Setup

Open Supabase SQL Editor and run these files in order:

1. `infra/postgres/init/001_schema.sql`
2. `infra/postgres/init/002_static_gtfs.sql`

These create:

- live TTC operational tables
- static GTFS tables
- subway schedule estimate tables
- demand analytics tables
- feed health tables

## Install Dependencies

### Frontend

```powershell
Set-Location ".\frontend"
npm install
Set-Location ".."
```

### Backend

```powershell
Set-Location ".\backend"
& ..\.venv\Scripts\python.exe -m pip install -r requirements.txt
Set-Location ".."
```

### Worker

```powershell
Set-Location ".\worker"
& ..\.venv\Scripts\python.exe -m pip install -r requirements.txt
Set-Location ".."
```

If `.venv` does not exist yet, create it first:

```powershell
python -m venv .venv
```

## Local Run Guide

### 1. Import static GTFS once

```powershell
Set-Location ".\worker"
& ..\.venv\Scripts\python.exe -m app.main static
```

This loads:

- routes
- stops
- trips
- scheduled stop times
- service calendars
- service exceptions
- subway schedule estimates

### 2. Run one live TTC ingest

```powershell
Set-Location ".\worker"
& ..\.venv\Scripts\python.exe -m app.main live
```

This refreshes:

- vehicle positions
- stop time updates
- alerts
- demand snapshots
- subway schedule estimates

### 3. Start the backend

```powershell
Set-Location ".\backend"
& ..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Useful local API checks:

- `http://localhost:8000/api/health`
- `http://localhost:8000/api/overview`
- `http://localhost:8000/api/alerts`

Note:
- `http://localhost:8000/` returning `404 Not Found` is expected because the API is mounted under `/api`

### 4. Start the frontend

In a second terminal:

```powershell
Set-Location ".\frontend"
npm run dev
```

Default local frontend URL:

- `http://localhost:5173`

### 5. Optional continuous local ingest

If you want the worker to keep polling locally:

```powershell
Set-Location ".\worker"
& ..\.venv\Scripts\python.exe -m app.main daemon
```

## Local Verification Checklist

After starting the system, verify these pages:

### Dashboard

Open:
- `http://localhost:5173`

Check:
- overview cards populate
- alerts display
- line status cards render
- demand panel renders
- dashboard analytics render

### Rapid line pages

Open:
- `http://localhost:5173/lines/1`
- `http://localhost:5173/lines/2`
- `http://localhost:5173/lines/4`
- `http://localhost:5173/lines/5`

Check:
- stations display correctly
- station nodes are clickable
- split line layouts render cleanly

### Station detail

From a line page, click a station and verify:
- scheduled subway arrivals display
- connected bus/streetcar routes display

## Backend API Summary

Local API base:
- `http://localhost:8000/api`

Production API base:
- `https://ttc-transit-backend.onrender.com/api`

Main endpoints:

- `GET /health`
- `GET /overview`
- `GET /alerts`
- `GET /stops/nearby`
- `GET /stops/{stop_id}/arrivals`
- `GET /routes/{route_id}/status`
- `GET /subway/lines`
- `GET /subway/lines/{route_id}/stations`
- `GET /subway/stations/{station_id}/detail`
- `GET /subway/stations/{station_id}/arrivals`
- `GET /analytics/demand`
- `GET /analytics/delays`

## Deployment

### Frontend deployment

Firebase publishes `frontend/dist`.

Build:

```powershell
Set-Location ".\frontend"
npm run build
```

Deploy from the repository root:

```powershell
Set-Location ".."
firebase deploy --only hosting
```

### Backend deployment

Render reads `render.yaml` and deploys the backend service.

Current production backend:
- `https://ttc-transit-backend.onrender.com/api`

Required Render environment variable:
- `DATABASE_URL`

### Worker deployment

GitHub Actions replaces a paid worker host.

Workflows:

- `.github/workflows/ttc-live-worker.yml`
- `.github/workflows/ttc-static-refresh.yml`

Required GitHub repository secret:
- `DATABASE_URL`

## Security Notes

- The frontend must never contain the raw Postgres connection string.
- Supabase public tables should have RLS enabled.
- The browser should only talk to the FastAPI backend, not directly to Supabase.

## Storage Notes

The largest database growth risks are:

- `stop_time_updates`
- `scheduled_stop_times`
- `trips`

The worker already replaces `stop_time_updates` each live ingest so the table does not grow without bound.

If manual cleanup is ever required:

```sql
truncate table public.stop_time_updates;
```

Then rerun the live worker.

## Common Failure Cases

### Frontend loads but no data appears

Check:

- backend is running
- `frontend/.env` points to `http://localhost:8000/api`
- `http://localhost:8000/api/health` works

### Backend starts but returns errors

Check:

- `DATABASE_URL` is valid
- Supabase schema was applied
- static GTFS import completed
- live worker completed at least once

### Station detail page fails

Check:

- static GTFS import was run
- live worker was run after static import

### Deep links such as `/lines/1` fail in production

Check:

- Firebase deploy came from the latest `main`
- browser cache was hard refreshed
- SPA rewrites in `firebase.json` are still present

## Minimum Correct Run Sequence

If you only want the shortest valid path:

1. create `.env` files
2. install frontend, backend, and worker dependencies
3. run `001_schema.sql` and `002_static_gtfs.sql`
4. run `python -m app.main static`
5. run `python -m app.main live`
6. start the backend
7. start the frontend
8. open `http://localhost:5173`

That is the minimum complete local run path for this project.
