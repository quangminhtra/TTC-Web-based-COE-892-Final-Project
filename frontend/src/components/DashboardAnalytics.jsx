export default function DashboardAnalytics({ analytics }) {
  const summary = analytics?.summary ?? [];
  const topDelays = analytics?.topDelays ?? [];

  return (
    <section className="panel analytics-panel">
      <div className="panel-heading">
        <div>
          <h2>Dashboard Analytics</h2>
          <p className="muted">Derived operational signals from current route status, demand windows, and delay estimates.</p>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="analytics-summary-grid">
          {summary.map((item) => (
            <article className="analytics-card" key={item.label}>
              <p className="card-label">{item.label}</p>
              <h3>{item.value}</h3>
              <p className="card-helper">{item.helper}</p>
            </article>
          ))}
        </div>

        <div className="analytics-delay-panel">
          <h3>Top Estimated Delays</h3>
          <div className="analytics-delay-list">
            {topDelays.length > 0 ? topDelays.map((delay) => (
              <article className="analytics-delay-row" key={delay.routeId}>
                <div>
                  <strong>{delay.routeName}</strong>
                  <p className="muted">Route {delay.routeId}</p>
                </div>
                <span className="status-chip delayed">{delay.delayMinutes} min</span>
              </article>
            )) : <p className="muted">No delay estimates are currently available.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
