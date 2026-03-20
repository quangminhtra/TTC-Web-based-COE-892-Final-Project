import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import RapidLinesPage from './pages/RapidLinesPage';
import StationDetailPage from './pages/StationDetailPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/lines/:routeId" element={<RapidLinesPage />} />
      <Route path="/stations/:stationId" element={<StationDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
