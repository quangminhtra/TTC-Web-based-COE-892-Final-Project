import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import Header from '../components/Header';
import TopNav from '../components/TopNav';
import { loadLineStations, loadRapidLines } from '../api';

function splitStations(routeId, stations) {
  if (routeId === '1') {
    const unionIndex = stations.findIndex((station) => station.name.includes('Union'));
    if (unionIndex > 0) {
      return [stations.slice(0, unionIndex + 1), stations.slice(unionIndex)];
    }
  }
  if (stations.length <= 18) {
    return [stations];
  }
  const midpoint = Math.ceil(stations.length / 2);
  return [stations.slice(0, midpoint), stations.slice(midpoint)];
}

function formatStationName(name) {
  const compact = name.replace(' Station', '');
  return compact.replace('-', '-\n');
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

  const stationColumns = useMemo(() => splitStations(lineData.routeId, lineData.stations), [lineData.routeId, lineData.stations]);

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
              <p className="muted">Select a line, then click a station for detail.</p>
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
              <h2>{lineData.routeName}</h2>
              <p className="muted">{lineData.mode === 'streetcar' ? 'Separate LRT case in TTC GTFS' : 'TTC-style station schematic'}</p>
            </div>
          </div>

          <div className={`schematic-board ${stationColumns.length > 1 ? 'two-column' : ''}`}>
            {stationColumns.map((column, columnIndex) => (
              <div className="schematic-column" key={`${lineData.routeId}-${columnIndex}`}>
                <div className={`schematic-rail ${lineData.colorClass}`} aria-hidden="true" />
                <div className="schematic-stations">
                  {column.map((station, stationIndex) => {
                    const isInterchange = station.interchangeRouteIds.length > 1;
                    const isTerminal = stationIndex === 0 || stationIndex === column.length - 1;
                    return (
                      <Link key={`${station.id}-${columnIndex}-${stationIndex}`} className="schematic-stop" to={`/stations/${station.id}`}>
                        <div className="schematic-node-wrap">
                          <span
                            className={`schematic-bullet ${lineData.colorClass} ${isInterchange ? 'interchange' : ''} ${isTerminal ? 'terminal' : ''}`}
                            aria-hidden="true"
                          />
                        </div>
                        <span className="schematic-stop-copy">
                          <span className={`schematic-stop-name ${isTerminal ? 'terminal' : ''}`}>{formatStationName(station.name)}</span>
                          {isInterchange ? (
                            <span className="schematic-stop-meta">Interchange: {station.interchangeRouteIds.join(' / ')}</span>
                          ) : null}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
