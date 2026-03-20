import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import Header from '../components/Header';
import TopNav from '../components/TopNav';
import { loadLineStations, loadRapidLines } from '../api';
import { RAPID_LINE_LAYOUTS } from '../lineLayouts';

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

function splitLineOneStations(stations) {
  const unionIndex = stations.findIndex((station) => station.label === 'Union');
  if (unionIndex <= 0) {
    return [stations];
  }
  return [stations.slice(0, unionIndex + 1), stations.slice(unionIndex).reverse()];
}

function formatStationDisplay(name) {
  return name.replace(/\s+-\s+/g, ' - ');
}

function VerticalLineColumn({ routeId, routeName, colorClass, stations, reverseRail = false }) {
  return (
    <div className="vertical-line-column">
      <div className={`vertical-line-rail ${colorClass} ${reverseRail ? 'reverse' : ''}`} aria-hidden="true" />
      <div className="vertical-line-stations">
        {stations.map((station, index) => {
          const isTerminal = index === 0 || index === stations.length - 1;
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
      <div className="vertical-line-caption">{routeName}</div>
    </div>
  );
}

function HorizontalStationStrip({ routeId, routeName, colorClass, stations }) {
  return (
    <div className="horizontal-strip-panel">
      <div className="horizontal-strip-header">
        <h3>{routeName}</h3>
        <p className="muted">Curated station order with accessible click targets.</p>
      </div>
      <div className="horizontal-strip-scroll">
        <div className={`horizontal-strip-rail ${colorClass}`} aria-hidden="true" />
        <div className="horizontal-strip-stations">
          {stations.map((station, index) => {
            const isTerminal = index === 0 || index === stations.length - 1;
            const isInterchange = station.interchanges.length > 0;
            const content = (
              <>
                <span className={`horizontal-strip-node ${colorClass} ${isTerminal ? 'terminal' : ''} ${isInterchange ? 'interchange' : ''}`} aria-hidden="true" />
                <span className={`horizontal-strip-name ${isTerminal ? 'terminal' : ''}`}>{formatStationDisplay(station.displayName)}</span>
                {isInterchange ? <span className="horizontal-strip-meta">{station.interchanges.join(' / ')}</span> : null}
              </>
            );

            return station.id ? (
              <Link key={`${routeId}-${station.label}`} className="horizontal-strip-stop" to={`/stations/${station.id}`}>
                {content}
              </Link>
            ) : (
              <div key={`${routeId}-${station.label}`} className="horizontal-strip-stop is-disabled">
                {content}
              </div>
            );
          })}
        </div>
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
  const lineOneColumns = useMemo(() => splitLineOneStations(curatedStations), [curatedStations]);

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
              <p className="muted">Vertical-first line layout for cleaner accessibility and predictable responsiveness.</p>
            </div>
          </div>

          {routeId === '1' ? (
            <div className="vertical-line-grid two-column-line-grid">
              <VerticalLineColumn
                routeId={routeId}
                routeName="Vaughan to Union"
                colorClass={lineColorClass}
                stations={lineOneColumns[0]}
              />
              <VerticalLineColumn
                routeId={routeId}
                routeName="Finch to Union"
                colorClass={lineColorClass}
                stations={lineOneColumns[1]}
                reverseRail
              />
            </div>
          ) : routeId === '4' ? (
            <div className="vertical-line-grid single-column-line-grid">
              <VerticalLineColumn
                routeId={routeId}
                routeName={lineName}
                colorClass={lineColorClass}
                stations={curatedStations}
              />
            </div>
          ) : (
            <HorizontalStationStrip
              routeId={routeId}
              routeName={lineName}
              colorClass={lineColorClass}
              stations={curatedStations}
            />
          )}
        </section>
      </main>
    </div>
  );
}
