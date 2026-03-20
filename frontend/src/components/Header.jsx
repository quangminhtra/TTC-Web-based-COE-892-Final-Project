export default function Header({ lastUpdated, loading, onRefresh }) {
  const formattedTimestamp = lastUpdated
    ? new Date(lastUpdated).toLocaleString()
    : 'Waiting for first load';

  return (
    <header className="topbar">
      <div>
        <h1>Public Transit System Dashboard - TTC</h1>
        <p className="subtitle">Real-time surface tracking, subway schedule estimates, and demand insights</p>
        <p className="subtitle">Last updated: {formattedTimestamp}</p>
      </div>
      <button
        className="primary-button"
        type="button"
        aria-label="Refresh dashboard data"
        onClick={onRefresh}
        disabled={loading}
      >
        {loading ? 'Refreshing...' : 'Refresh information'}
      </button>
    </header>
  );
}
