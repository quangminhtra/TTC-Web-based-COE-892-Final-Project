const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';
const DEFAULT_LOCATION = { lat: 43.6532, lon: -79.3832 };
const ROUTE_IDS = ['1', '2', '4', '5'];

async function fetchJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
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
    second: '2-digit',
  });
}

function formatOverviewCards(cards) {
  return cards.map((card) => {
    if (card.label !== 'Feed Freshness') {
      return card;
    }
    return {
      ...card,
      value: formatTimestamp(card.value),
    };
  });
}

function normalizeAlert(alert) {
  if (!alert) {
    return {
      title: null,
      message: 'No TTC service alerts are currently stored in the system.',
      severity: 'info',
    };
  }

  const title = alert.title?.trim();
  const message = alert.message?.trim() ?? '';
  const hideTitle = !title || message.toLowerCase().startsWith(title.toLowerCase());

  return {
    ...alert,
    title: hideTitle ? null : title,
    message,
  };
}

export async function loadDashboardData(location = DEFAULT_LOCATION) {
  const [overview, alerts, demand, nearbyStops, routeStatuses] = await Promise.all([
    fetchJson('/overview'),
    fetchJson('/alerts'),
    fetchJson('/analytics/demand'),
    fetchJson(`/stops/nearby?lat=${location.lat}&lon=${location.lon}`),
    Promise.all(ROUTE_IDS.map((routeId) => fetchJson(`/routes/${routeId}/status`))),
  ]);

  const stops = nearbyStops.stops.slice(0, 5);
  const stopArrivals = await Promise.all(
    stops.map(async (stop) => {
      const path = stop.mode === 'subway'
        ? `/subway/stations/${stop.stop_id}/arrivals`
        : `/stops/${stop.stop_id}/arrivals`;
      const arrivals = await fetchJson(path);
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
}

export async function loadRapidLines() {
  const data = await fetchJson('/subway/lines');
  return data.lines.map((line) => ({
    id: line.route_id,
    name: line.route_name,
    colorClass: lineColorClass(line.route_id),
    mode: line.mode,
  }));
}

export async function loadLineStations(routeId) {
  const data = await fetchJson(`/subway/lines/${routeId}/stations`);
  return {
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
}

export async function loadStationDetail(stationId) {
  const [detail, arrivals] = await Promise.all([
    fetchJson(`/subway/stations/${stationId}/detail`),
    fetchJson(`/subway/stations/${stationId}/arrivals`),
  ]);

  return {
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
}

function cleanStationName(name) {
  return name.replace(/\s*-\s*(Northbound|Southbound|Eastbound|Westbound) Platform$/i, '');
}

export { API_BASE_URL, DEFAULT_LOCATION, ROUTE_IDS, lineColorClass };
