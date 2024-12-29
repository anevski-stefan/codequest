import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './features/auth/Login';
import Dashboard from './features/dashboard/Dashboard';
import PrivateRoute from './components/PrivateRoute';
import AuthCallback from './features/auth/AuthCallback';
import MyAssignedIssues from './components/MyAssignedIssues';
import Profile from './features/profile/Profile';
import ProfileActivity from './features/profile/ProfileActivity';
import ProfileSettings from './features/profile/ProfileSettings';
import SuggestedIssues from './features/suggested/SuggestedIssues';
import HackathonList from './components/HackathonList';
import Explore from './features/explore/Explore';
import RepositoryDetails from './features/explore/RepositoryDetails';

const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/hackathons" element={<HackathonList />} />
        
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
        >
          <Route path="assigned" element={<MyAssignedIssues />} />
          <Route path="activity" element={<ProfileActivity />} />
          <Route path="settings" element={<ProfileSettings />} />
        </Route>
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes; 