export default function StationList({ stations }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Key Stations</h2>
          <a  className="text-button"  href="https://www.google.com/maps/" role="button" aria-label="View stations on Google Maps">
          View stations on map</a>
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
            </div>
          </li>
        ))}
      </ul>
    </section>
  );

}
