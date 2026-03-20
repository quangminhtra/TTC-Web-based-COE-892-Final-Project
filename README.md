# TTC Web Based COE 892 Final Project

Distributed public transit system for TTC live monitoring, subway schedule reference, and crowd-demand insight.

## Repository Structure

- `frontend/`: React + Vite user interface
- `backend/`: FastAPI REST API
- `worker/`: TTC ingestion and schedule-generation jobs
- `infra/`: SQL schema and optional local runtime helpers
- `render.yaml`: Render blueprint for backend, worker, and static refresh job

## Architecture

- Official TTC GTFS-RT feeds provide live bus and streetcar data.
- Official static GTFS data provides routes, stops, trips, and subway schedule reference data.
- Subway arrivals are exposed as `scheduled estimate`, not live prediction.
- Passenger demand and crowding are simulated in backend processing.
- Backend and worker both connect directly to Supabase Postgres through one `DATABASE_URL`.

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
7. Run continuous live ingestion locally:
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

The repo includes `render.yaml` with three services:

- `ttc-transit-backend`: FastAPI web service
- `ttc-transit-worker`: continuous GTFS-RT ingestion worker
- `ttc-transit-static-refresh`: daily static GTFS refresh cron job

Deployment flow:

1. Push the repository to GitHub.
2. In Render, create a new Blueprint and point it to the repository.
3. Render will detect `render.yaml` and create the three services.
4. Set `DATABASE_URL` in Render for all three services to the Supabase session-pooler connection string.
5. Deploy the backend and worker services.
6. After the backend URL is live, set `frontend/.env` to that URL and redeploy Firebase.

## Current Status

- Frontend dashboard and subway-line views are connected to the backend.
- Backend reads live and scheduled data from Supabase.
- Worker ingests TTC GTFS-RT data, imports static GTFS data, and generates subway schedule estimates.
