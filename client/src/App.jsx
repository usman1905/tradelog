import { Navigate, Route, Routes } from 'react-router';
import { useAuth } from './context/AuthContext.jsx';
import { Layout } from './components/Layout.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Trades } from './pages/Trades.jsx';
import { Login } from './pages/Login.jsx';

function RequireAuth({ children }) {
  const { user, checking } = useAuth();
  if (checking) return <p className="muted loading">Loading…</p>;
  return user ? children : <Navigate to="/login" replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="trades" element={<Trades />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
