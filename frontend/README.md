# Frontend README

## Purpose

The frontend is the user-facing TTC dashboard. It is a React + Vite single-page application deployed to Firebase Hosting. It consumes the FastAPI backend and does not talk directly to Supabase.

Primary user flows:

- dashboard overview
- line status and demand analytics
- nearby stops and arrivals
- rapid transit line views
- station detail pages for subway and LRT stations

## Stack

- React 18
- React Router DOM 6
- Vite 5
- Firebase Hosting for production deployment

## Directory Map

- `src/pages/`
  - page-level route components
- `src/components/`
  - reusable dashboard and station UI
- `src/api.js`
  - API client, response formatting, cache helpers
- `src/lineLayouts.js`
  - curated station ordering and display metadata
- `src/styles.css`
  - application styling

## Environment

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

Production currently uses:

```env
VITE_API_BASE_URL=https://ttc-transit-backend.onrender.com/api
```

## Install

From the repository root:

```powershell
Set-Location "E:\School\Winter term\COE 892\public-transit-project\frontend"
npm install
```

## Local Development

Start the frontend:

```powershell
Set-Location "E:\School\Winter term\COE 892\public-transit-project\frontend"
npm run dev
```

Default local URL:

- `http://localhost:5173`

The frontend expects the backend to be running on:

- `http://localhost:8000/api`

unless `VITE_API_BASE_URL` is changed.

## Build

```powershell
Set-Location "E:\School\Winter term\COE 892\public-transit-project\frontend"
npm run build
```

Vite outputs production assets to:

- `frontend/dist`

## Deployment

Firebase Hosting is configured from the repository root.

Build first:

```powershell
Set-Location "E:\School\Winter term\COE 892\public-transit-project\frontend"
npm run build
```

Deploy from the repository root:

```powershell
Set-Location "E:\School\Winter term\COE 892\public-transit-project"
firebase deploy --only hosting
```

## Frontend Architecture

### 1. Data loading

The frontend loads data through `src/api.js`. That module:

- builds requests from `VITE_API_BASE_URL`
- formats overview cards and timestamps
- normalizes analytics payloads
- caches successful responses in `localStorage`
- falls back to cached responses during Render cold starts

### 2. Routing

Routes are handled with React Router:

- `/`
  - dashboard
- `/lines/:routeId`
  - rapid line page
- `/stations/:stationId`
  - station detail page

Firebase uses SPA rewrites so deep links resolve to `index.html`.

### 3. Cached fallback

The app caches:

- dashboard payloads
- rapid line metadata
- line station payloads
- station detail payloads

This is not full offline mode. It only improves repeat visits and cold-start behavior.

### 4. Curated line display

The line pages use curated metadata from `src/lineLayouts.js` instead of trusting raw GTFS station ordering. That lets the UI correct:

- station naming
- terminal emphasis
- line splitting
- interchange labeling

## Key Components

- `DashboardPage.jsx`
  - dashboard orchestration
- `RapidLinesPage.jsx`
  - line page layout and station link rendering
- `StationDetailPage.jsx`
  - station detail content and arrival panels
- `DashboardAnalytics.jsx`
  - demand and delay summary cards
- `DemandPanel.jsx`
  - demand snapshot display

## Expected Backend Endpoints

The frontend depends on these backend routes:

- `GET /overview`
- `GET /alerts`
- `GET /analytics/demand`
- `GET /analytics/delays`
- `GET /stops/nearby`
- `GET /stops/{stop_id}/arrivals`
- `GET /subway/lines`
- `GET /subway/lines/{route_id}/stations`
- `GET /subway/stations/{station_id}/detail`
- `GET /subway/stations/{station_id}/arrivals`

## Common Development Checks

Build check:

```powershell
Set-Location "E:\School\Winter term\COE 892\public-transit-project\frontend"
npm run build
```

If a page is blank in production:

1. verify Firebase deploy came from `main`
2. hard refresh the browser
3. check the browser console for runtime errors
4. inspect `Network` requests to confirm the backend URL is correct

## Ownership Notes

Frontend is responsible for:

- presentation
- client routing
- cached fallback behavior
- line and station display logic

Frontend is not responsible for:

- TTC feed ingestion
- database writes
- direct Supabase access
