export default function Header() {
  return (
    <header className="topbar">
      <div>
        <h1>Public Transit System Dashboard - TTC</h1>
        <p className="subtitle">Real-time tracking and passenger overview</p>
      </div>
      <button className="primary-button" type="button" aria-label="Refresh dashboard data">
        Refresh information
      </button>
    </header>
  );
}
