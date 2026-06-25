import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import RidersPage from './pages/RidersPage';
import TripsPage from './pages/TripsPage';
import PaymentsPage from './pages/PaymentsPage';
import PromotionsPage from './pages/PromotionsPage';
import ReportsPage from './pages/ReportsPage';
import ComplaintsPage from './pages/ComplaintsPage';
import SettingsPage from './pages/SettingsPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="riders" element={<RidersPage />} />
          <Route path="trips" element={<TripsPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="promotions" element={<PromotionsPage />} />
          <Route path="complaints" element={<ComplaintsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
