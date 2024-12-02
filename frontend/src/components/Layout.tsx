import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import useAuth from '../hooks/useAuth';
import type { RootState } from '../store';

const Layout = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {isAuthenticated && (
        <header className="bg-white shadow">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-xl font-semibold">GitHub Dashboard</h1>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </header>
      )}
      <div className="container mx-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout; 