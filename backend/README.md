# Backend README

## Purpose

The backend is a FastAPI service that exposes a stable REST API for the frontend. It reads processed TTC data from Supabase and does not fetch TTC feeds during request handling.

Responsibilities:

- expose dashboard, stop, route, subway, and analytics endpoints
- translate database records into frontend-facing response models
- keep the frontend independent from raw TTC feed structure

## Stack

- FastAPI
- Uvicorn
- psycopg 3
- Pydantic Settings
- Supabase Postgres
- Render for production hosting

## Directory Map

- `app/main.py`
  - FastAPI app bootstrap and router registration
- `app/config.py`
  - environment settings
- `app/db.py`
  - Postgres connection management
- `app/routers/`
  - HTTP routes
- `app/services/`
  - service layer orchestration
- `app/repositories/`
  - SQL queries and database access
- `app/schemas/`
  - response models

## Environment

Create `backend/.env`:

```env
APP_NAME=TTC Transit API
ENVIRONMENT=development
API_PREFIX=/api
DATABASE_URL=postgresql://...
```

Use the Supabase session-pooler connection string for hosted environments.

## Install

```powershell
Set-Location "E:\School\Winter term\COE 892\public-transit-project\backend"
& ..\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## Run Locally

```powershell
Set-Location "E:\School\Winter term\COE 892\public-transit-project\backend"
& ..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Local API base:

- `http://localhost:8000/api`

Health check:

- `http://localhost:8000/api/health`

## Production Deployment

Production backend is hosted on Render.

Current deployment base:

- `https://ttc-transit-backend.onrender.com/api`

Render configuration is defined in:

- `render.yaml`

Key production variables:

- `APP_NAME`
- `ENVIRONMENT`
- `API_PREFIX`
- `DATABASE_URL`

## Backend Architecture

### Request flow

1. frontend calls a FastAPI endpoint
2. router delegates to the service layer
3. service delegates to the repository layer
4. repository executes SQL against Supabase
5. schema models shape the response returned to the client

### Router groups

- `health`
- `overview`
- `alerts`
- `stops`
- `routes`
- `subway`
- `analytics`

### Data contract

The backend exposes frontend-ready JSON. It hides:

- GTFS-Realtime protobuf details
- raw static GTFS table complexity
- line and station matching rules

## CORS

`app/main.py` currently allows all origins:

- `allow_origins=["*"]`

That is acceptable for this project but should be narrowed in a hardened production environment.

## Core Queries

Most backend logic currently lives in:

- `app/repositories/dashboard.py`

That file handles:

- overview cards
- alerts
- nearby stops
- arrivals
- route status
- rapid line metadata
- line station data
- station detail lookup
- connected routes
- demand analytics
- delay analytics

## Local Verification

Backend smoke checks:

- `GET /api/health`
- `GET /api/overview`
- `GET /api/alerts`
- `GET /api/subway/lines`

Example PowerShell check:

```powershell
Invoke-RestMethod https://ttc-transit-backend.onrender.com/api/health | ConvertTo-Json -Depth 5
```

## Operational Notes

- The backend depends on data already loaded into Supabase by the worker.
- If GitHub Actions or local worker ingestion stops, the backend still runs but data freshness degrades.
- Render free tier can cold start, which slows first-page loads on the frontend.

## Ownership Notes

Backend is responsible for:

- API contract
- query composition
- response shaping
- data access rules

Backend is not responsible for:

- direct TTC ingestion
- long-running polling
- Firebase hosting
