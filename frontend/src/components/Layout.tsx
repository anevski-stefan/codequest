import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import useAuth from '../hooks/useAuth';
import type { RootState } from '../store';

const Layout = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const isAssignedView = location.pathname === '/assigned';

  return (
    <div className="min-h-screen bg-gray-50">
      {isAuthenticated && (
        <header className="bg-white shadow">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold">GitHub Dashboard</h1>
              <button
                onClick={() => navigate(isAssignedView ? '/' : '/assigned')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isAssignedView 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {isAssignedView ? 'All Issues' : 'My Assigned Issues'}
              </button>
            </div>
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