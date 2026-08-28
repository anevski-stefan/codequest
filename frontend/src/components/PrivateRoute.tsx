import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
const PrivateRoute = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const {
    isAuthenticated,
    restored
  } = useSelector((state: RootState) => state.auth);
  const location = useLocation();
  if (!restored) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading…
      </div>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{
      from: location
    }} replace />;
  }
  return <>{children}</>;
};
export default PrivateRoute;