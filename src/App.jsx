import Header from './components/Header';
import AlertBanner from './components/AlertBanner';
import OverviewCards from './components/OverviewCards';
import LineStatus from './components/LineStatus';
import StationList from './components/StationList';
import ArrivalBoard from './components/ArrivalBoard';
import DemandPanel from './components/DemandPanel';
import { alerts, overviewCards, lines, stations, arrivals, demandSummary } from './data';

export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <main className="main-content">
        <AlertBanner alert={alerts[0]} />
        <OverviewCards cards={overviewCards} />

        <div className="dashboard-grid">
          <div className="left-column">
            <LineStatus lines={lines} />
            <StationList stations={stations} />
          </div>

          <div className="right-column">
            <ArrivalBoard arrivals={arrivals} />
            <DemandPanel demandSummary={demandSummary} />
          </div>
        </div>
      </main>
    </div>
  );
}
