# API README

## Purpose

This document describes the public application API exposed by the FastAPI backend.

Base URL in production:

- `https://ttc-transit-backend.onrender.com/api`

Base URL in local development:

- `http://localhost:8000/api`

## API Characteristics

- protocol: HTTP/HTTPS
- style: REST
- payload format: JSON
- authentication: none for this project

The API is public at the service layer. The database is not intended to be public.

## Health

### `GET /health`

Confirms that the backend is running.

Response:

```json
{
  "status": "ok",
  "service": "TTC Transit API",
  "timestamp": "2026-03-29T12:00:00.000000Z"
}
```

## Dashboard

### `GET /overview`

Returns dashboard cards and freshness metadata.

Used by:

- home dashboard overview cards

### `GET /alerts`

Returns current TTC alert summaries.

Used by:

- dashboard alert banner

## Stops

### `GET /stops/nearby?lat={lat}&lon={lon}`

Returns nearby stops and stations based on a geographic point.

Used by:

- nearby stops panel

### `GET /stops/{stop_id}/arrivals`

Returns arrivals for a stop.

Used by:

- stop arrival board

## Routes

### `GET /routes/{route_id}/status`

Returns a route-level summary for display in the dashboard.

Used by:

- line status cards

## Rapid Transit

### `GET /subway/lines`

Returns the list of rapid transit lines available to the UI.

Used by:

- line selector page

### `GET /subway/lines/{route_id}/stations`

Returns the station list for a selected line.

Used by:

- `/lines/:routeId`

### `GET /subway/stations/{station_id}/detail`

Returns detail for a specific rapid-transit station, including nearby connected routes.

Used by:

- station detail page

### `GET /subway/stations/{station_id}/arrivals`

Returns scheduled subway arrivals for the selected station.

Used by:

- station detail right-side arrivals panel

## Analytics

### `GET /analytics/demand`

Returns demand snapshot summaries.

Used by:

- dashboard demand panel

### `GET /analytics/delays`

Returns derived delay analytics.

Used by:

- dashboard analytics section

## Local Testing

PowerShell examples:

```powershell
Invoke-RestMethod http://localhost:8000/api/health | ConvertTo-Json -Depth 5
```

```powershell
Invoke-RestMethod http://localhost:8000/api/overview | ConvertTo-Json -Depth 6
```

```powershell
Invoke-RestMethod http://localhost:8000/api/subway/lines/1/stations | ConvertTo-Json -Depth 6
```

## Error Model

Typical failure classes:

- `404 Not Found`
  - wrong route or wrong base path
- `500 Internal Server Error`
  - backend query or transformation failure
- browser fetch failure
  - backend unavailable, wrong `VITE_API_BASE_URL`, or Render cold start timeout

## Integration Notes

The frontend should configure:

```env
VITE_API_BASE_URL=https://ttc-transit-backend.onrender.com/api
```

Do not point the frontend at:

- Supabase PostgREST
- the raw Postgres connection string
- TTC GTFS feed URLs

## Data Source Provenance

The API is not the original TTC feed. It is an application API built on top of:

- TTC GTFS-Realtime vehicle positions
- TTC GTFS-Realtime trip updates
- TTC GTFS-Realtime alerts
- TTC static GTFS routes and schedules

## Ownership Notes

This API exists to:

- stabilize the contract consumed by the frontend
- centralize business logic in one layer
- prevent direct frontend coupling to TTC feed formats or database schema
