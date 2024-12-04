import { Outlet, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import useAuth from '../hooks/useAuth';
import { LogOut } from 'lucide-react';
import type { RootState } from '../store';

const Layout = () => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-800">
      {isAuthenticated && (
        <nav className="bg-white dark:bg-gray-800 shadow mt-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16 space-x-32">
              <div className="flex items-center">
                <button 
                  onClick={() => navigate('/')}
                  className="text-2xl font-bold text-gray-900 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-150"
                >
                  Code Quest
                </button>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/profile')}
                  className="flex items-center space-x-2 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  <div className="relative w-10 h-10 overflow-hidden bg-gray-200 dark:bg-gray-700 rounded-full">
                    <img
                      src={user?.avatar_url}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400">
                    {user?.login}
                  </span>
                </button>
                <button
                  onClick={logout}
                  className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition duration-150 ease-in-out flex items-center"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}
      <div className="flex-1 flex overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout; 