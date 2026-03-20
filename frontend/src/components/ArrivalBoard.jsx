export default function ArrivalBoard({ arrivals, title }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Upcoming Arrivals</h2>
          <p className="muted">{title}</p>
        </div>
        <span className="muted">Live vs scheduled</span>
      </div>
      <div className="table-wrapper">
        <table>
          <caption className="sr-only">Upcoming transit arrivals</caption>
          <thead>
            <tr>
              <th>Destination</th>
              <th>Route</th>
              <th>Arrival</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {arrivals.map((arrival, index) => (
              <tr key={`${arrival.destination}-${index}`}>
                <td>{arrival.destination}</td>
                <td>{arrival.platform}</td>
                <td>{arrival.time}</td>
                <td>
                  <span className="arrival-label">
                    {arrival.arrivalType === 'scheduled' ? 'Scheduled estimate' : 'Live'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
