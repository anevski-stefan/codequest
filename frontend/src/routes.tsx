import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './features/home/Home';
import Login from './features/auth/Login';
import Dashboard from './features/dashboard/Dashboard';
import PrivateRoute from './components/PrivateRoute';
import AuthCallback from './features/auth/AuthCallback';

const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes; 