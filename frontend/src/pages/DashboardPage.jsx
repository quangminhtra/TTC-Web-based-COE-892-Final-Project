import { useEffect, useState } from 'react';
import Header from '../components/Header';
import TopNav from '../components/TopNav';
import AlertBanner from '../components/AlertBanner';
import OverviewCards from '../components/OverviewCards';
import DashboardAnalytics from '../components/DashboardAnalytics';
import LineStatus from '../components/LineStatus';
import StationList from '../components/StationList';
import ArrivalBoard from '../components/ArrivalBoard';
import DemandPanel from '../components/DemandPanel';
import { DEFAULT_LOCATION, getCachedDashboardData, loadDashboardData } from '../api';

const initialState = {
  alert: { title: 'Loading TTC data', message: 'Fetching backend dashboard data.', severity: 'info' },
  overviewCards: [],
  lines: [],
  stations: [],
  arrivals: [],
  arrivalsTitle: 'Loading',
  demandSummary: [],
  analytics: { summary: [], topDelays: [] },
  lastUpdated: null,
  cacheState: null,
};

const cachedInitialState = getCachedDashboardData(DEFAULT_LOCATION) ?? initialState;

function withCacheNotice(dashboard) {
  if (!dashboard?.cacheState) {
    return dashboard;
  }

  return {
    ...dashboard,
    alert: {
      message: 'Showing cached TTC data while the backend wakes up. Information may be stale.',
      severity: 'info',
    },
  };
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(withCacheNotice(cachedInitialState));
  const [loading, setLoading] = useState(!cachedInitialState?.cacheState && cachedInitialState === initialState);
  const [error, setError] = useState('');
  const [location, setLocation] = useState(DEFAULT_LOCATION);

  async function refreshDashboard(currentLocation = location) {
    setLoading(true);
    setError('');
    try {
      const nextDashboard = await loadDashboardData(currentLocation);
      setDashboard(withCacheNotice(nextDashboard));
    } catch (refreshError) {
      setError(refreshError.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!navigator.geolocation) {
      refreshDashboard(DEFAULT_LOCATION);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };

        const cachedForLocation = getCachedDashboardData(nextLocation);
        if (cachedForLocation) {
          setDashboard(withCacheNotice(cachedForLocation));
          setLoading(false);
        }

        setLocation(nextLocation);
        refreshDashboard(nextLocation);
      },
      () => {
        refreshDashboard(DEFAULT_LOCATION);
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
  }, []);

  return (
    <div className="app-shell">
      <TopNav />
      <Header
        lastUpdated={dashboard.lastUpdated}
        loading={loading}
        onRefresh={() => refreshDashboard(location)}
      />
      <main className="main-content">
        {error ? <p className="panel status-message error-message">{error}</p> : null}
        <AlertBanner alert={dashboard.alert} />
        <OverviewCards cards={dashboard.overviewCards} />
        <DashboardAnalytics analytics={dashboard.analytics} />

        <div className="dashboard-grid">
          <div className="left-column">
            <LineStatus lines={dashboard.lines} />
            <StationList stations={dashboard.stations} />
          </div>

          <div className="right-column">
            <ArrivalBoard arrivals={dashboard.arrivals} title={dashboard.arrivalsTitle} />
            <DemandPanel demandSummary={dashboard.demandSummary} />
          </div>
        </div>
      </main>
    </div>
  );
}
