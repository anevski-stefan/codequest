import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import LoadingSpinner from './components/LoadingSpinner';
const Login = lazy(() => import('./features/auth/Login'));
const AuthCallback = lazy(() => import('./features/auth/AuthCallback'));
const Dashboard = lazy(() => import('./features/dashboard/Dashboard'));
const Profile = lazy(() => import('./features/profile/Profile'));
const Settings = lazy(() => import('./features/settings/Settings'));
const SuggestedIssues = lazy(() => import('./features/suggested/SuggestedIssues'));
const HackathonList = lazy(() => import('./components/HackathonList'));
const Explore = lazy(() => import('./features/explore/Explore'));
const RepositoryDetails = lazy(() => import('./features/explore/RepositoryDetails'));
const ContributorProfile = lazy(() => import('./features/explore/ContributorProfile'));
const AssignedIssuesPage = lazy(() => import('./features/assigned/AssignedIssues'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./components/TermsOfService'));
const PageFallback = () => <div className="flex items-center justify-center min-h-screen">
    <LoadingSpinner />
  </div>;
const AppRoutes = () => {
  return <Suspense fallback={<PageFallback />}>
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
    </Suspense>;
};
export default AppRoutes;