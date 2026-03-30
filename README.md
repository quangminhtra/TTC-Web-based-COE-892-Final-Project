# TTC Web Based COE 892 Final Project

Distributed public transit system for TTC live monitoring, subway schedule reference, and crowd-demand insight.

Deployed frontend:
- https://ttc-app-tmu.web.app/

## Repository Structure

- `frontend/`: React + Vite user interface
- `backend/`: FastAPI REST API
- `worker/`: TTC ingestion and schedule-generation jobs
- `infra/`: SQL schema and optional local runtime helpers
- `docs/api/`: API reference documentation
- `render.yaml`: Render blueprint for the backend web service
- `.github/workflows/ttc-live-worker.yml`: scheduled live TTC ingest job
- `.github/workflows/ttc-static-refresh.yml`: scheduled static GTFS refresh job

Detailed component documentation:

- `frontend/README.md`
- `backend/README.md`
- `infra/README.md`
- `docs/api/README.md`

## Architecture

- Official TTC GTFS-RT feeds provide live bus and streetcar data.
- Official static GTFS data provides routes, stops, trips, and subway schedule reference data.
- Subway arrivals are exposed as `scheduled estimate`, not live prediction.
- Passenger demand and crowding are simulated in backend processing.
- Backend and worker both connect directly to Supabase Postgres through one `DATABASE_URL`.
- Render hosts the backend API.
- GitHub Actions runs scheduled worker jobs for TTC data refresh.

## Environment Files

Create these local files and do not commit them:

- `frontend/.env`
- `backend/.env`
- `worker/.env`

Templates are provided in:

- `frontend/.env.example`
- `backend/.env.example`
- `worker/.env.example`

## Database Setup

Run both schema files in Supabase SQL Editor:

- `infra/postgres/init/001_schema.sql`
- `infra/postgres/init/002_static_gtfs.sql`

## Local Development

1. Install frontend dependencies:
   - `cd frontend`
   - `npm install`
2. Install backend dependencies:
   - `cd backend`
   - `..\.venv\Scripts\python.exe -m pip install -r requirements.txt`
3. Install worker dependencies:
   - `cd worker`
   - `..\.venv\Scripts\python.exe -m pip install -r requirements.txt`
4. Start the backend:
   - `cd backend`
   - `& ..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
5. Start the frontend:
   - `cd frontend`
   - `npm run dev`
6. Refresh live data once:
   - `cd worker`
   - `& ..\.venv\Scripts\python.exe -m app.main live`
7. Run continuous live ingestion locally if needed:
   - `cd worker`
   - `& ..\.venv\Scripts\python.exe -m app.main daemon`
8. Refresh static GTFS and subway schedule estimates:
   - `cd worker`
   - `& ..\.venv\Scripts\python.exe -m app.main static`

## Frontend Deployment

Firebase Hosting is configured from the repository root and publishes `frontend/dist`.

Deployment flow:

1. Set `frontend/.env` with the deployed backend API URL:
   - `VITE_API_BASE_URL=https://your-backend-service.onrender.com/api`
2. Build the frontend:
   - `cd frontend`
   - `npm run build`
3. Deploy from the repository root:
   - `firebase deploy --only hosting`

## Render Deployment

`render.yaml` defines one Render service:

- `ttc-transit-backend`: FastAPI web service

Deployment flow:

1. Push the repository to GitHub.
2. In Render, create a new Blueprint and point it to the repository.
3. Use your active deployment branch when creating the Render blueprint.
4. Render will detect `render.yaml` and create the backend service.
5. Set `DATABASE_URL` in Render to the Supabase session-pooler connection string.
6. Deploy the backend service.
7. Verify:
   - `https://your-backend-service.onrender.com/api/health`
   - `https://your-backend-service.onrender.com/api/overview`

## GitHub Actions Worker Deployment

Two GitHub Actions workflows replace the paid Render worker/cron services:

- `ttc-live-worker.yml`: runs every 5 minutes for live TTC ingest
- `ttc-static-refresh.yml`: runs daily for static GTFS refresh

Required GitHub repository secret:

- `DATABASE_URL`: Supabase session-pooler Postgres connection string

GitHub setup flow:

1. Open your GitHub repository.
2. Go to `Settings -> Secrets and variables -> Actions`.
3. Add a new repository secret named `DATABASE_URL`.
4. Push the branch containing these workflow files.
5. Open the `Actions` tab and confirm both workflows are visible.
6. Run both workflows once manually with `Run workflow`.
7. Check that Supabase tables update and backend endpoints return fresh data.

Operational note:

- GitHub Actions is scheduled, not continuous. Live TTC ingestion updates every 5 minutes, not every 30 seconds.

## Current Status

- Frontend dashboard and subway-line views are connected to the backend.
- Backend reads live and scheduled data from Supabase.
- Worker ingests TTC GTFS-RT data, imports static GTFS data, and generates subway schedule estimates.
