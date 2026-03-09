export default function ArrivalBoard({ arrivals }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Upcoming Arrivals</h2>
        <button className="text-button" type="button">Station details</button>
      </div>
      <div className="table-wrapper">
        <table>
          <caption className="sr-only">Upcoming train arrivals</caption>
          <thead>
            <tr>
              <th>Destination</th>
              <th>Platform</th>
              <th>Arrival</th>
            </tr>
          </thead>
          <tbody>
            {arrivals.map((arrival, index) => (
              <tr key={`${arrival.destination}-${index}`}>
                <td>{arrival.destination}</td>
                <td>{arrival.platform}</td>
                <td>{arrival.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
