export default function LineStatus({ lines }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Line Status</h2>
        <span className="muted">API-backed routes</span>
      </div>
      <div className="line-list">
        {lines.map((line) => (
          <article className="line-card" key={line.id}>
            <div className={`line-badge ${line.colorClass}`} aria-hidden="true" />
            <div>
              <h3>{line.name}</h3>
              <p className="muted">{line.source}</p>
            </div>
            <span className={`status-chip ${line.status.toLowerCase()}`}>{line.status}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
