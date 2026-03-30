export default function DemandPanel({ demandSummary }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Passenger Demand</h2>
        <span className="muted">Simulated analytics</span>
      </div>
      <div className="demand-list">
        {demandSummary.map((item) => (
          <article className="demand-row" key={item.period}>
            <div>
              <h3>{item.period}</h3>
              <p className="muted">{item.note}</p>
            </div>
            <span className={`status-chip ${item.passengers.toLowerCase()}`}>{item.passengers}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
