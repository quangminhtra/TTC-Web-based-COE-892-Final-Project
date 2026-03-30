import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import Header from '../components/Header';
import TopNav from '../components/TopNav';
import { getCachedLineStations, getCachedRapidLines, loadLineStations, loadRapidLines } from '../api';
import { RAPID_LINE_LAYOUTS } from '../lineLayouts';

const TERMINAL_STATIONS = {
  '1': new Set(['Vaughan Metropolitan Centre', 'Finch', 'Union']),
  '2': new Set(['Kipling', 'Kennedy']),
  '4': new Set(['Sheppard-Yonge', 'Don Mills']),
  '5': new Set(['Mount Dennis', 'Kennedy']),
};

function normalizeStationName(value) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\b(lrt|subway|station|platform|eastbound|westbound|northbound|southbound)\b/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function resolveStation(layoutStation, apiStations) {
  if (layoutStation.stationId) {
    const explicitMatch = apiStations.find((station) => station.id === layoutStation.stationId);
    if (explicitMatch) {
      return explicitMatch;
    }
  }

  const candidates = [layoutStation.label, layoutStation.displayName, ...(layoutStation.aliases ?? [])];
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeStationName(candidate);
    const match = apiStations.find((station) => normalizeStationName(station.name) === normalizedCandidate);
    if (match) {
      return match;
    }
  }
  return null;
}

function enrichStations(layoutStations, apiStations) {
  return layoutStations.map((layoutStation) => {
    const matched = resolveStation(layoutStation, apiStations);
    return {
      ...layoutStation,
      id: matched?.id ?? layoutStation.stationId ?? null,
      apiName: matched?.name ?? null,
    };
  });
}

function formatStationDisplay(name) {
  return name.replace(/\s+-\s+/g, ' - ');
}

function isTerminalStation(routeId, stationLabel) {
  return TERMINAL_STATIONS[routeId]?.has(stationLabel) ?? false;
}

function getStationVisualWeight(routeId, station) {
  let weight = 1;

  const isTerminal = isTerminalStation(routeId, station.label);
  const isInterchange = station.interchanges.length > 0;
  const hasLongName = station.displayName.length > 18;

  if (isTerminal) weight += 0.9;
  if (isInterchange) weight += 0.45;
  if (hasLongName) weight += 0.2;

  return weight;
}

function findBalancedSplitIndex(routeId, stations) {
  if (stations.length < 2) return 1;

  const weights = stations.map((station) => getStationVisualWeight(routeId, station));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);

  let leftWeight = 0;
  let bestIndex = 1;
  let bestDifference = Number.POSITIVE_INFINITY;

  for (let i = 1; i < stations.length; i += 1) {
    leftWeight += weights[i - 1];
    const rightWeight = totalWeight - leftWeight;
    const difference = Math.abs(leftWeight - rightWeight);

    if (difference < bestDifference) {
      bestDifference = difference;
      bestIndex = i;
    }
  }

  return bestIndex;
}

function splitStationsForLayout(routeId, stations) {
  if (routeId === '1') {
    const unionIndex = stations.findIndex((station) => station.label === 'Union');
    if (unionIndex > 0) {
      return [
        { key: 'west', stations: stations.slice(0, unionIndex + 1) },
        { key: 'east', stations: stations.slice(unionIndex).reverse() },
      ];
    }
  }

  if (routeId === '2' || routeId === '5') {
    const splitIndex = findBalancedSplitIndex(routeId, stations);
    return [
      { key: 'first', stations: stations.slice(0, splitIndex) },
      { key: 'second', stations: stations.slice(splitIndex) },
    ];
  }

  return [{ key: 'single', stations }];
}

function VerticalLineColumn({ routeId, colorClass, stations, showTopRail, showBottomRail, railMode = 'default' }) {
  return (
    <div className={`vertical-line-column ${railMode === 'line-one-return' ? 'line-one-return-column' : ''}`}>
      <div className={`vertical-line-rail ${colorClass} ${showTopRail ? 'show-top' : ''} ${showBottomRail ? 'show-bottom' : ''} ${railMode}`} aria-hidden="true" />
      <div className="vertical-line-stations">
        {stations.map((station) => {
          const isTerminal = isTerminalStation(routeId, station.label);
          const isInterchange = station.interchanges.length > 0;
          const content = (
            <>
              <div className="vertical-line-node-wrap">
                <span className={`vertical-line-node ${colorClass} ${isTerminal ? 'terminal' : ''} ${isInterchange ? 'interchange' : ''}`} aria-hidden="true" />
              </div>
              <div className="vertical-line-copy">
                <span className={`vertical-line-name ${isTerminal ? 'terminal' : ''}`}>{formatStationDisplay(station.displayName)}</span>
                {isInterchange ? <span className="vertical-line-meta">Interchange: {station.interchanges.join(' / ')}</span> : null}
              </div>
            </>
          );

          return station.id ? (
            <Link key={`${routeId}-${station.label}`} className="vertical-line-stop" to={`/stations/${station.id}`}>
              {content}
            </Link>
          ) : (
            <div key={`${routeId}-${station.label}`} className="vertical-line-stop is-disabled">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RapidLinesPage() {
  const { routeId = '1' } = useParams();
  const cachedLines = getCachedRapidLines() ?? [];
  const cachedLineData = getCachedLineStations(routeId) ?? { routeId: '1', routeName: '', stations: [], colorClass: 'line-yellow', mode: 'subway' };

  const [lines, setLines] = useState(cachedLines);
  const [lineData, setLineData] = useState(cachedLineData);
  const [loading, setLoading] = useState(!(cachedLines.length > 0 || cachedLineData.stations.length > 0));
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPage() {
      setLoading(true);
      setError('');
      try {
        const [rapidLines, currentLine] = await Promise.all([loadRapidLines(), loadLineStations(routeId)]);
        setLines(rapidLines);
        setLineData(currentLine);
      } catch (loadError) {
        setError(loadError.message || 'Failed to load rapid line data.');
      } finally {
        setLoading(false);
      }
    }

    const nextCachedLineData = getCachedLineStations(routeId);
    if (nextCachedLineData) {
      setLineData(nextCachedLineData);
      setLoading(false);
    }

    loadPage();
  }, [routeId]);

  const layout = RAPID_LINE_LAYOUTS[routeId] ?? RAPID_LINE_LAYOUTS['1'];
  const curatedStations = useMemo(() => enrichStations(layout.stations, lineData.stations), [layout.stations, lineData.stations]);
  const displayLine = lines.find((line) => line.id === routeId);
  const lineName = displayLine?.name ?? layout.routeName;
  const lineColorClass = displayLine?.colorClass ?? lineData.colorClass;
  const stationColumns = useMemo(() => splitStationsForLayout(routeId, curatedStations), [routeId, curatedStations]);
  const gridClass = stationColumns.length > 1 ? 'two-column-line-grid' : 'single-column-line-grid';

  return (
    <div className="app-shell">
      <TopNav />
      <Header lastUpdated={new Date().toISOString()} loading={loading} onRefresh={() => window.location.reload()} />
      <main className="main-content">
        {error ? <p className="panel status-message error-message">{error}</p> : null}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Rapid Transit Lines</h2>
            </div>
          </div>
          <div className="line-selector">
            {lines.map((line) => (
              <NavLink key={line.id} className={({ isActive }) => `line-tab ${isActive ? 'active' : ''}`} to={`/lines/${line.id}`}>
                <span className={`line-dot ${line.colorClass}`} />
                {line.name}
              </NavLink>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>{lineName}</h2>
            </div>
          </div>

          <div className={`vertical-line-grid ${gridClass}`}>
            {stationColumns.map((column, index) => (
              <VerticalLineColumn
                key={`${routeId}-${column.key}`}
                routeId={routeId}
                colorClass={lineColorClass}
                stations={column.stations}
                showTopRail={index > 0 && routeId !== '1'}
                showBottomRail={index < stationColumns.length - 1 && routeId !== '1'}
                railMode={routeId === '1' && index === 1 ? 'line-one-return' : 'default'}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
