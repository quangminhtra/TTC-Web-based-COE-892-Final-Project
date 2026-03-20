import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '../components/Header';
import TopNav from '../components/TopNav';
import { lineColorClass, loadStationDetail } from '../api';

export default function StationDetailPage() {
  const { stationId = '' } = useParams();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPage() {
      setLoading(true);
      setError('');
      try {
        const stationDetail = await loadStationDetail(stationId);
        setDetail(stationDetail);
      } catch (loadError) {
        setError(loadError.message || 'Failed to load station detail.');
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [stationId]);

  return (
    <div className="app-shell">
      <TopNav />
      <Header lastUpdated={new Date().toISOString()} loading={loading} onRefresh={() => window.location.reload()} />
      <main className="main-content">
        {error ? <p className="panel status-message error-message">{error}</p> : null}
        {detail ? (
          <>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>{detail.stationName}</h2>
                  <p className="muted">Station detail view</p>
                </div>
                {detail.primaryRouteId ? (
                  <Link className="text-button" to={`/lines/${detail.primaryRouteId}`}>
                    Back to {detail.primaryRouteName}
                  </Link>
                ) : null}
              </div>
            </section>

            <div className="detail-grid">
              <div className="left-column">
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Line Status</h2>
                  </div>
                  <div className="line-list">
                    {detail.lineStatuses.map((status) => (
                      <article className="line-card" key={status.route_id}>
                        <div className={`line-badge ${status.colorClass}`} aria-hidden="true" />
                        <div>
                          <h3>{status.route_name}</h3>
                          <p className="muted">{status.mode === 'streetcar' ? 'LRT line case' : 'Subway line'}</p>
                        </div>
                        <span className={`status-chip ${status.status.toLowerCase()}`}>{status.statusLabel}</span>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="panel">
                  <div className="panel-heading">
                    <h2>Connected Bus / Streetcar Routes</h2>
                  </div>
                  <div className="connected-route-list">
                    {detail.connectedRoutes.length > 0 ? detail.connectedRoutes.map((route) => (
                      <article className="connected-route-item" key={`${route.route_id}-${route.mode}`}>
                        <strong>{route.route_id}</strong>
                        <span>{route.route_name}</span>
                        <span className="muted">{route.mode}</span>
                      </article>
                    )) : <p className="muted">No connected routes were found near this station.</p>}
                  </div>
                </section>
              </div>

              <div className="right-column">
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Scheduled Subway Arrivals</h2>
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Destination</th>
                          <th>Route</th>
                          <th>Arrival</th>
                          <th>Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.arrivals.map((arrival, index) => (
                          <tr key={`${arrival.route_id}-${index}`}>
                            <td>{arrival.destination}</td>
                            <td>{arrival.route_name}</td>
                            <td>{arrival.timeLabel}</td>
                            <td><span className="arrival-label">Scheduled estimate</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
