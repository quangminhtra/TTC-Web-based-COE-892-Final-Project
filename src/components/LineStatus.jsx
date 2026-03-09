export default function LineStatus({ lines }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Line Status</h2>
        <button className="text-button" type="button">View all</button>
      </div>
      <div className="line-list">
        {lines.map((line) => (
          <article className="line-card" key={line.id}>
            <div className={`line-badge ${line.colorClass}`} aria-hidden="true" />
            <div>
              <h3>{line.name}</h3>
              <p className="muted">Current service condition</p>
            </div>
            <span className={`status-chip ${line.status.toLowerCase()}`}>{line.status}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
