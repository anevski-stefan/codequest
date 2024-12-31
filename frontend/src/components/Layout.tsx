import { Outlet, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import useAuth from '../hooks/useAuth';
import { LogOut, Settings } from 'lucide-react';
import type { RootState } from '../store';
import { useState } from 'react';

const Layout = () => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0B1222] overflow-x-hidden">
      {isAuthenticated && (
        <nav className="bg-white/80 dark:bg-transparent backdrop-blur-lg shadow h-20 flex items-center relative z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full h-full flex items-center">
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center">
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="text-xl sm:text-2xl font-bold text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                >
                  Code Quest
                </button>
              </div>
              
              {/* Mobile menu button */}
              <div className="md:hidden">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <span className="sr-only">Open main menu</span>
                  {!isMobileMenuOpen ? (
                    <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  ) : (
                    <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Desktop navigation */}
              <div className="hidden md:flex items-center space-x-4">
                <button
                  onClick={() => navigate('/profile/activity')}
                  className="flex items-center space-x-2"
                >
                  <div className="relative w-10 h-10 overflow-hidden bg-gray-200 dark:bg-gray-700 rounded-full">
                    <img
                      src={user?.avatar_url}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
                    {user?.login}
                  </span>
                </button>
                <button
                  onClick={() => navigate('/assigned')}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                >
                  Assigned Issues
                </button>
                <button
                  onClick={() => navigate('/suggested')}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                >
                  Suggested Issues
                </button>
                <button
                  onClick={() => navigate('/explore')}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                >
                  Explore
                </button>
                <button
                  onClick={() => navigate('/settings')}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                >
                  <Settings className="h-5 w-5" />
                </button>
                <button
                  onClick={logout}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors flex items-center"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Mobile menu */}
          <div 
            className="md:hidden absolute top-16 inset-x-0 bg-white dark:bg-[#0B1222] backdrop-blur-lg shadow-lg z-50"
            style={{
              opacity: isMobileMenuOpen ? 1 : 0,
              visibility: isMobileMenuOpen ? 'visible' : 'hidden',
              transition: 'opacity 0.3s ease-in-out, visibility 0.3s ease-in-out',
              minHeight: '120px'
            }}
          >
            <div className="px-2 pt-4 pb-4 space-y-3">
              <button
                onClick={() => {
                  navigate('/profile/activity');
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-3 text-base font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors rounded-md"
                style={{
                  transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(50px)',
                  opacity: isMobileMenuOpen ? 1 : 0,
                  transition: 'all 0.2s ease-out',
                  transitionDelay: '75ms'
                }}
              >
                Profile
              </button>
              <button
                onClick={() => {
                  navigate('/suggested');
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-3 text-base font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors rounded-md"
                style={{
                  transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(50px)',
                  opacity: isMobileMenuOpen ? 1 : 0,
                  transition: 'all 0.2s ease-out',
                  transitionDelay: '75ms'
                }}
              >
                Suggested Issues
              </button>
              <button
                onClick={() => {
                  navigate('/settings');
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-3 text-base font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors rounded-md"
                style={{
                  transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(50px)',
                  opacity: isMobileMenuOpen ? 1 : 0,
                  transition: 'all 0.2s ease-out',
                  transitionDelay: '75ms'
                }}
              >
                Settings
              </button>
              <button
                onClick={() => {
                  logout();
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-3 text-base font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors rounded-md"
                style={{
                  transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(50px)',
                  opacity: isMobileMenuOpen ? 1 : 0,
                  transition: 'all 0.2s ease-out',
                  transitionDelay: '150ms'
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </nav>
      )}
      <div className="flex-1 flex overflow-hidden">
        <main className="w-full max-w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout; 