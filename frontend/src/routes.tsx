import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './features/auth/Login';
import Dashboard from './features/dashboard/Dashboard';
import PrivateRoute from './components/PrivateRoute';
import AuthCallback from './features/auth/AuthCallback';
import Profile from './features/profile/Profile';
import Settings from './features/settings/Settings';
import SuggestedIssues from './features/suggested/SuggestedIssues';
import HackathonList from './components/HackathonList';
import Explore from './features/explore/Explore';
import RepositoryDetails from './features/explore/RepositoryDetails';
import ContributorProfile from './features/explore/ContributorProfile';
import AssignedIssuesPage from './features/assigned/AssignedIssues';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
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
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route path="/hackathons" element={<HackathonList />} />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          }
        />
        <Route
          path="/suggested"
          element={
            <PrivateRoute>
              <SuggestedIssues />
            </PrivateRoute>
          }
        />
        <Route
          path="/explore"
          element={
            <PrivateRoute>
              <Explore />
            </PrivateRoute>
          }
        />
        <Route
          path="/explore/:owner/:repo"
          element={
            <PrivateRoute>
              <RepositoryDetails />
            </PrivateRoute>
          }
        />
        <Route
          path="/contributors/:username"
          element={
            <PrivateRoute>
              <ContributorProfile />
            </PrivateRoute>
          }
        />
        <Route
          path="/assigned"
          element={
            <PrivateRoute>
              <AssignedIssuesPage />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes; 