import { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import lazyWithRetry from './utils/lazyWithRetry';
const Login = lazyWithRetry(() => import('./features/auth/Login'));
const AuthCallback = lazyWithRetry(() => import('./features/auth/AuthCallback'));
const Dashboard = lazyWithRetry(() => import('./features/dashboard/Dashboard'));
const Profile = lazyWithRetry(() => import('./features/profile/Profile'));
const Settings = lazyWithRetry(() => import('./features/settings/Settings'));
const SuggestedIssues = lazyWithRetry(() => import('./features/suggested/SuggestedIssues'));
const HackathonList = lazyWithRetry(() => import('./components/HackathonList'));
const Explore = lazyWithRetry(() => import('./features/explore/Explore'));
const RepositoryDetails = lazyWithRetry(() => import('./features/explore/RepositoryDetails'));
const ContributorProfile = lazyWithRetry(() => import('./features/explore/ContributorProfile'));
const AssignedIssuesPage = lazyWithRetry(() => import('./features/assigned/AssignedIssues'));
const PrivacyPolicy = lazyWithRetry(() => import('./components/PrivacyPolicy'));
const TermsOfService = lazyWithRetry(() => import('./components/TermsOfService'));
const PageFallback = () => <div className="flex items-center justify-center min-h-screen">
    <LoadingSpinner />
  </div>;
const AppRoutes = () => {
  const location = useLocation();
  return <ErrorBoundary resetKey={location.pathname}>
      <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/dashboard" element={<PrivateRoute>
                <Dashboard />
              </PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute>
                <Profile />
              </PrivateRoute>} />
          <Route path="/hackathons" element={<HackathonList />} />
          <Route path="/settings" element={<PrivateRoute>
                <Settings />
              </PrivateRoute>} />
          <Route path="/suggested" element={<PrivateRoute>
                <SuggestedIssues />
              </PrivateRoute>} />
          <Route path="/explore" element={<PrivateRoute>
                <Explore />
              </PrivateRoute>} />
          <Route path="/explore/:owner/:repo" element={<PrivateRoute>
                <RepositoryDetails />
              </PrivateRoute>} />
          <Route path="/contributors/:username" element={<PrivateRoute>
                <ContributorProfile />
              </PrivateRoute>} />
          <Route path="/assigned" element={<PrivateRoute>
                <AssignedIssuesPage />
              </PrivateRoute>} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
    </ErrorBoundary>;
};
export default AppRoutes;