# TTC Tracker Run Guide for TA

## What This Guide Covers

This guide is for a fresh reviewer who has just downloaded the repository and wants to run the TTC tracker locally with the same architecture used in the project:

- React frontend
- FastAPI backend
- Supabase Postgres database
- worker for TTC GTFS ingestion

This document focuses on the shortest correct setup path.

## System Overview

The project is split into four operational parts:

1. `frontend/`
   - React + Vite web client
2. `backend/`
   - FastAPI REST API
3. `worker/`
   - TTC feed ingestion and static GTFS import
4. `infra/`
   - SQL schema files for the database

Production architecture uses:

- Firebase Hosting for the frontend
- Render for the backend
- GitHub Actions for scheduled worker runs
- Supabase for the database

For local review, the TA only needs:

- Supabase database access
- local backend
- local frontend
- optional local worker run to refresh data

## Prerequisites

Install these first:

- Python 3.13+
- Node.js 18+ and npm
- Git
- a Supabase project or a valid Supabase `DATABASE_URL`

Optional:

- Firebase CLI, only if deployment needs to be tested

## 1. Clone the Repository

```powershell
git clone https://github.com/quangminhtra/TTC-Web-based-COE-892-Final-Project.git
Set-Location "TTC-Web-based-COE-892-Final-Project"
```

If the TA is using a downloaded ZIP instead:

1. extract the ZIP
2. open a terminal in the project root

## 2. Create Environment Files

Create these files locally:

- `frontend/.env`
- `backend/.env`
- `worker/.env`

Templates already exist:

- `frontend/.env.example`
- `backend/.env.example`
- `worker/.env.example`

### frontend/.env

For local use:

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

## 3. Set Up the Python Environment

If `.venv` already exists in the repo, it can be reused. Otherwise create one:

```powershell
python -m venv .venv
```

Install backend dependencies:

```powershell
Set-Location "backend"
& ..\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Install worker dependencies:

```powershell
Set-Location "..\\worker"
& ..\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Return to repo root if needed:

```powershell
Set-Location ".."
```

## 4. Install Frontend Dependencies

```powershell
Set-Location "frontend"
npm install
Set-Location ".."
```

## 5. Initialize the Database

Open Supabase SQL Editor and run these files in order:

1. `infra/postgres/init/001_schema.sql`
2. `infra/postgres/init/002_static_gtfs.sql`

These create:

- live TTC data tables
- static GTFS tables
- subway schedule estimate tables
- demand snapshot storage

## 6. Load Static GTFS Data

Run this once after the schema is created:

```powershell
Set-Location "worker"
& ..\.venv\Scripts\python.exe -m app.main static
```

This imports:

- routes
- stops
- trips
- scheduled stop times
- service calendars
- service exceptions

and generates:

- subway schedule estimates

## 7. Refresh Live TTC Data

Run a one-time live ingest:

```powershell
Set-Location "worker"
& ..\.venv\Scripts\python.exe -m app.main live
```

This refreshes:

- vehicle positions
- stop time updates
- service alerts
- simulated demand snapshots
- subway schedule estimates

Optional long-running local ingest:

```powershell
Set-Location "worker"
& ..\.venv\Scripts\python.exe -m app.main daemon
```

## 8. Start the Backend

In a terminal:

```powershell
Set-Location ".\backend"
& ..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Expected backend checks:

- `http://localhost:8000/api/health`
- `http://localhost:8000/api/overview`
- `http://localhost:8000/api/alerts`

Notes:

- `http://localhost:8000/` will return `404 Not Found`
- that is expected because the API is mounted under `/api`

## 9. Start the Frontend

In a second terminal:

```powershell
Set-Location ".\frontend"
npm run dev
```

Expected local URL:

- `http://localhost:5173`

## 10. Verify the Application

Open:

- `http://localhost:5173`

Check these flows:

### Dashboard

- overview cards populate
- alerts show current TTC data
- line status cards render
- demand panel renders
- dashboard analytics render

### Rapid lines

Open:

- `http://localhost:5173/lines/1`
- `http://localhost:5173/lines/2`
- `http://localhost:5173/lines/4`
- `http://localhost:5173/lines/5`

Check:

- stations display
- line splits render correctly
- station nodes are clickable

### Station detail

Open one station from the line page and verify:

- scheduled subway arrivals display
- connected bus/streetcar routes display

## 11. Known Project Constraints

- Subway arrivals are currently **scheduled estimates**, not live TTC subway predictions.
- Connected bus/streetcar routes are shown as nearby connected routes; the page does not show arrival times for each connected surface route.
- Render free-tier cold starts were mitigated in the frontend using local cache fallback.

## 12. If Something Fails

### Frontend loads but no data appears

Check:

- backend is running
- `frontend/.env` points to `http://localhost:8000/api`
- `/api/health` works in the browser

### Backend starts but overview fails

Check:

- `DATABASE_URL` is valid
- Supabase schema has been applied
- static and live worker runs completed successfully

### Station pages fail

Check:

- static GTFS import was run
- live ingest was run after static import

### No subway schedule data

Run again:

```powershell
Set-Location "worker"
& ..\.venv\Scripts\python.exe -m app.main static
```

## 13. Optional Production Verification

Production frontend:

- `https://ttc-app-tmu.web.app/`

Production backend:

- `https://ttc-transit-backend.onrender.com/api/health`

These are useful for quick comparison against the local environment.

## 14. Files Worth Reading During Review

- `README.md`
- `frontend/README.md`
- `backend/README.md`
- `infra/README.md`
- `docs/api/README.md`

## 15. Minimum Correct Run Sequence

If the TA only wants the shortest path:

1. create `.env` files
2. install backend, worker, and frontend dependencies
3. run `001_schema.sql` and `002_static_gtfs.sql`
4. run `python -m app.main static`
5. run `python -m app.main live`
6. start FastAPI backend
7. start Vite frontend
8. open `http://localhost:5173`

That is the minimum complete local run path for this project.
