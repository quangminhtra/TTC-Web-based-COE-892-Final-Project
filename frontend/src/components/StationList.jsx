export default function StationList({ stations }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Nearby Stops & Stations</h2>
        <span className="muted">Location-aware backend query</span>
      </div>
      <ul className="station-list">
        {stations.map((station) => (
          <li className="station-item" key={station.id}>
            <div>
              <h3>{station.name}</h3>
              <p className="muted">{station.line}</p>
            </div>
            <div className="station-meta">
              <span>{station.nextArrival}</span>
              <span>{station.crowd} crowd</span>
              <span className="arrival-label">{station.arrivalType === 'scheduled' ? 'Scheduled estimate' : 'Live'}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
