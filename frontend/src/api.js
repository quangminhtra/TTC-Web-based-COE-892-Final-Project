const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';
const DEFAULT_LOCATION = { lat: 43.6532, lon: -79.3832 };
const ROUTE_IDS = ['1', '2', '4', '5'];
const CACHE_PREFIX = 'ttc-dashboard-cache:v1';
const DASHBOARD_CACHE_TTL_MS = 15 * 60 * 1000;
const LINE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const STATION_CACHE_TTL_MS = 15 * 60 * 1000;

async function fetchJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function storageAvailable() {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function getCacheKey(scope, key) {
  return `${CACHE_PREFIX}:${scope}:${key}`;
}

// Cache the last successful API payload per view so the UI can render immediately while the backend wakes up.
function readCache(scope, key, ttlMs) {
  if (!storageAvailable()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(getCacheKey(scope, key));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || parsed.data == null) {
      return null;
    }

    const ageMs = Date.now() - parsed.savedAt;
    return {
      data: parsed.data,
      isExpired: ageMs > ttlMs,
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

function writeCache(scope, key, data) {
  if (!storageAvailable()) {
    return;
  }

  try {
    window.localStorage.setItem(
      getCacheKey(scope, key),
      JSON.stringify({ savedAt: Date.now(), data })
    );
  } catch {
    // Ignore storage quota / serialization failures.
  }
}

function markCachedPayload(payload, cached, reason = 'cached') {
  return {
    ...payload,
    cacheState: {
      source: reason,
      isStale: cached.isExpired,
      savedAt: cached.savedAt,
    },
  };
}

function dashboardCacheKey(location) {
  const lat = Number(location?.lat ?? DEFAULT_LOCATION.lat).toFixed(3);
  const lon = Number(location?.lon ?? DEFAULT_LOCATION.lon).toFixed(3);
  return `${lat},${lon}`;
}

function lineColorClass(routeId) {
  if (routeId === '1') return 'line-yellow';
  if (routeId === '2') return 'line-green';
  if (routeId === '4') return 'line-purple';
  return 'line-orange';
}

function titleCase(value) {
  if (!value) return 'Unknown';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatRelativeMinutes(value) {
  if (value === 0) return 'Now';
  return `${value} min`;
}

function formatTimestamp(value) {
  if (!value) return 'Unavailable';
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }
  return timestamp.toLocaleString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatOverviewCards(cards) {
  return cards.map((card) => {
    if (card.label === 'Feed Freshness') {
      return {
        ...card,
        value: formatTimestamp(card.value),
      };
    }

    if (card.label === 'Demand Snapshots') {
      return {
        ...card,
        helper: 'Peak and off-peak demand windows',
      };
    }

    return card;
  });
}

function normalizeAlert(alert) {
  if (!alert) {
    return {
      message: 'No TTC service alerts are currently stored in the system.',
      severity: 'info',
    };
  }

  return {
    ...alert,
    message: alert.message?.trim() ?? '',
  };
}

function cleanStationName(name) {
  return name.replace(/\s*-\s*(Northbound|Southbound|Eastbound|Westbound) Platform$/i, '');
}

function transformDashboardPayload(overview, alerts, demand, nearbyStops, routeStatuses) {
  const stops = nearbyStops.stops.slice(0, 5);

  return async (arrivalFetcher) => {
    const stopArrivals = await Promise.all(
      stops.map(async (stop) => {
        const path = stop.mode === 'subway'
          ? `/subway/stations/${stop.stop_id}/arrivals`
          : `/stops/${stop.stop_id}/arrivals`;
        const arrivals = await arrivalFetcher(path);
        return { stopId: stop.stop_id, arrivals: arrivals.arrivals };
      })
    );

    const arrivalMap = new Map(stopArrivals.map((entry) => [entry.stopId, entry.arrivals]));
    const primaryStop = stops.find((stop) => (arrivalMap.get(stop.stop_id) ?? []).length > 0) ?? stops[0] ?? null;
    const primaryArrivals = primaryStop ? (arrivalMap.get(primaryStop.stop_id) ?? []) : [];

    return {
      lastUpdated: new Date().toISOString(),
      alert: normalizeAlert(alerts.alerts[0]),
      overviewCards: formatOverviewCards(overview.cards),
      lines: routeStatuses.map(({ route }) => ({
        id: route.route_id,
        name: route.route_name,
        colorClass: lineColorClass(route.route_id),
        status: titleCase(route.status),
        source: route.source === 'gtfs_static' ? 'Scheduled data' : 'Live TTC feed',
      })),
      stations: stops.map((stop) => {
        const arrivals = arrivalMap.get(stop.stop_id) ?? [];
        const nextArrival = arrivals[0];
        return {
          id: stop.stop_id,
          name: stop.stop_name,
          line: stop.route_names.length > 0 ? stop.route_names.join(' / ') : titleCase(stop.mode),
          crowd: titleCase(nextArrival?.crowd_level ?? 'medium'),
          nextArrival: nextArrival ? formatRelativeMinutes(nextArrival.arrival_in_minutes) : 'No estimate',
          arrivalType: nextArrival?.arrival_type ?? (stop.mode === 'subway' ? 'scheduled' : 'live'),
        };
      }),
      arrivals: primaryArrivals.map((arrival) => ({
        destination: arrival.destination,
        platform: arrival.route_name,
        time: formatRelativeMinutes(arrival.arrival_in_minutes),
        arrivalType: arrival.arrival_type,
        mode: arrival.mode,
      })),
      arrivalsTitle: primaryStop ? primaryStop.stop_name : 'No stop selected',
      demandSummary: demand.demand.map((item) => ({
        period: item.period,
        passengers: titleCase(item.level),
        note: item.note,
      })),
    };
  };
}

function buildDashboardAnalytics(lines, demandSummary, delays) {
  const delayedRoutes = lines.filter((line) => line.status.toLowerCase() === 'delayed').length;
  const liveRoutes = lines.filter((line) => line.source === 'Live TTC feed').length;
  const highestDemand = demandSummary.find((item) => item.passengers === 'High') ?? demandSummary[0] ?? null;

  return {
    summary: [
      {
        label: 'Rapid Lines With Route Alerts',
        value: String(delayedRoutes),
        helper: 'Rapid lines currently marked delayed',
      },
      {
        label: 'Rapid Lines Using Live Feed',
        value: String(liveRoutes),
        helper: 'Routes backed by GTFS-RT updates',
      },
      {
        label: 'Highest Demand Window',
        value: highestDemand ? highestDemand.period : 'Unavailable',
        helper: highestDemand ? highestDemand.passengers : 'No demand data',
      },
    ],
    topDelays: delays.slice(0, 5).map((delay) => ({
      routeId: delay.route_id,
      routeName: delay.route_name,
      delayMinutes: Number(delay.average_delay_minutes ?? 0).toFixed(1),
    })),
  };
}

export function getCachedDashboardData(location = DEFAULT_LOCATION) {
  const cached = readCache('dashboard', dashboardCacheKey(location), DASHBOARD_CACHE_TTL_MS);
  return cached ? markCachedPayload(cached.data, cached) : null;
}

export function getCachedRapidLines() {
  const cached = readCache('rapid-lines', 'all', LINE_CACHE_TTL_MS);
  return cached ? cached.data : null;
}

export function getCachedLineStations(routeId) {
  const cached = readCache('line-stations', routeId, LINE_CACHE_TTL_MS);
  return cached ? markCachedPayload(cached.data, cached) : null;
}

export function getCachedStationDetail(stationId) {
  const cached = readCache('station-detail', stationId, STATION_CACHE_TTL_MS);
  return cached ? markCachedPayload(cached.data, cached) : null;
}

export async function loadDashboardData(location = DEFAULT_LOCATION) {
  const cacheKey = dashboardCacheKey(location);
  const cached = readCache('dashboard', cacheKey, DASHBOARD_CACHE_TTL_MS);

  try {
    const [overview, alerts, demand, nearbyStops, routeStatuses, delays] = await Promise.all([
      fetchJson('/overview'),
      fetchJson('/alerts'),
      fetchJson('/analytics/demand'),
      fetchJson(`/stops/nearby?lat=${location.lat}&lon=${location.lon}`),
      Promise.all(ROUTE_IDS.map((routeId) => fetchJson(`/routes/${routeId}/status`))),
      fetchJson('/analytics/delays'),
    ]);

    const payloadBuilder = transformDashboardPayload(overview, alerts, demand, nearbyStops, routeStatuses);
    const payload = await payloadBuilder((path) => fetchJson(path));
    payload.analytics = buildDashboardAnalytics(payload.lines, payload.demandSummary, delays.delays ?? []);
    writeCache('dashboard', cacheKey, payload);
    return payload;
  } catch (error) {
    if (cached) {
      return markCachedPayload(cached.data, cached, 'fallback');
    }
    throw error;
  }
}

export async function loadRapidLines() {
  const cached = readCache('rapid-lines', 'all', LINE_CACHE_TTL_MS);

  try {
    const data = await fetchJson('/subway/lines');
    const payload = data.lines.map((line) => ({
      id: line.route_id,
      name: line.route_name,
      colorClass: lineColorClass(line.route_id),
      mode: line.mode,
    }));
    writeCache('rapid-lines', 'all', payload);
    return payload;
  } catch (error) {
    if (cached) {
      return cached.data;
    }
    throw error;
  }
}

export async function loadLineStations(routeId) {
  const cached = readCache('line-stations', routeId, LINE_CACHE_TTL_MS);

  try {
    const data = await fetchJson(`/subway/lines/${routeId}/stations`);
    const payload = {
      routeId: data.route_id,
      routeName: data.route_name,
      mode: data.mode,
      colorClass: lineColorClass(data.route_id),
      stations: data.stations.map((station) => ({
        id: station.station_id,
        name: cleanStationName(station.station_name),
        interchangeRouteIds: station.interchange_route_ids,
      })),
    };
    writeCache('line-stations', routeId, payload);
    return payload;
  } catch (error) {
    if (cached) {
      return cached.data;
    }
    throw error;
  }
}

export async function loadStationDetail(stationId) {
  const cached = readCache('station-detail', stationId, STATION_CACHE_TTL_MS);

  try {
    const [detail, arrivals] = await Promise.all([
      fetchJson(`/subway/stations/${stationId}/detail`),
      fetchJson(`/subway/stations/${stationId}/arrivals`),
    ]);

    const payload = {
      stationId: detail.station_id,
      stationName: cleanStationName(detail.station_name),
      primaryRouteId: detail.primary_route_id,
      primaryRouteName: detail.primary_route_name,
      connectedRoutes: detail.connected_routes,
      lineStatuses: detail.line_statuses.map((status) => ({
        ...status,
        statusLabel: titleCase(status.status),
        colorClass: lineColorClass(status.route_id),
      })),
      arrivals: arrivals.arrivals.map((arrival) => ({
        ...arrival,
        timeLabel: formatRelativeMinutes(arrival.arrival_in_minutes),
      })),
    };
    writeCache('station-detail', stationId, payload);
    return payload;
  } catch (error) {
    if (cached) {
      return cached.data;
    }
    throw error;
  }
}

export { API_BASE_URL, DEFAULT_LOCATION, ROUTE_IDS, lineColorClass };



