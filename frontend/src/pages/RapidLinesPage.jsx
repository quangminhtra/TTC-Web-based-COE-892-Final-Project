import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import Header from '../components/Header';
import TopNav from '../components/TopNav';
import { loadLineStations, loadRapidLines } from '../api';
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
      id: matched?.id ?? null,
      apiName: matched?.name ?? null,
    };
  });
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
    const midpoint = Math.ceil(stations.length / 2);
    return [
      { key: 'first', stations: stations.slice(0, midpoint) },
      { key: 'second', stations: stations.slice(midpoint) },
    ];
  }

  return [{ key: 'single', stations }];
}

function formatStationDisplay(name) {
  return name.replace(/\s+-\s+/g, ' - ');
}

function isTerminalStation(routeId, stationLabel) {
  return TERMINAL_STATIONS[routeId]?.has(stationLabel) ?? false;
}

function VerticalLineColumn({ routeId, colorClass, stations, showTopRail, showBottomRail }) {
  return (
    <div className="vertical-line-column">
      <div className={`vertical-line-rail ${colorClass} ${showTopRail ? 'show-top' : ''} ${showBottomRail ? 'show-bottom' : ''}`} aria-hidden="true" />
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
  const [lines, setLines] = useState([]);
  const [lineData, setLineData] = useState({ routeId: '1', routeName: '', stations: [], colorClass: 'line-yellow', mode: 'subway' });
  const [loading, setLoading] = useState(true);
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
              <p className="muted">Curated station layouts with corrected terminals and explicit interchange markers.</p>
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
              <p className="muted">Accessible vertical layout with curated station order.</p>
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
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
