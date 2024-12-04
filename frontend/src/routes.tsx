import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './features/home/Home';
import Login from './features/auth/Login';
import Dashboard from './features/dashboard/Dashboard';
import PrivateRoute from './components/PrivateRoute';
import AuthCallback from './features/auth/AuthCallback';
import MyAssignedIssues from './components/MyAssignedIssues';
import Profile from './features/profile/Profile';
import ProfileOverview from './features/profile/ProfileOverview';
import ProfileActivity from './features/profile/ProfileActivity';
import ProfileSettings from './features/profile/ProfileSettings';

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
        <Route
          path="/assigned"
          element={
            <PrivateRoute>
              <MyAssignedIssues />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        >
          <Route index element={<ProfileOverview />} />
          <Route path="assigned" element={<MyAssignedIssues />} />
          <Route path="activity" element={<ProfileActivity />} />
          <Route path="settings" element={<ProfileSettings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes; 