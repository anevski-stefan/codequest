import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import useAuth from '../hooks/useAuth';
import { LogOut } from 'lucide-react';
import type { RootState } from '../store';
import { useState, useEffect, ReactNode } from 'react';
import FeedbackModal from './FeedbackModal';

interface LayoutProps {
  children?: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0B1222] overflow-x-hidden">
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled ? 'bg-white/80 dark:bg-[#0B1222]/80' : 'bg-white dark:bg-[#0B1222]'
      } backdrop-blur-lg shadow`}>
        <div className="max-w-7xl mx-auto h-20 flex items-center">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/')}
                className="text-xl sm:text-2xl font-bold text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
              >
                Code Quest
              </button>
            </div>

            {isAuthenticated ? (
              // Authenticated navigation menu
              <>
                {/* Desktop navigation */}
                <div className="hidden md:flex items-center space-x-4 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
                  <div className="flex items-center space-x-4 px-4">
                    <button
                      onClick={() => navigate('/profile')}
                      className="flex items-center space-x-2 shrink-0"
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
                      className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors whitespace-nowrap"
                    >
                      Assigned Issues
                    </button>
                    <button
                      onClick={() => navigate('/suggested')}
                      className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors whitespace-nowrap"
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
                      Settings
                    </button>
                    <button
                      onClick={logout}
                      className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors flex items-center shrink-0"
                    >
                      <LogOut className="h-5 w-5 mr-2" />
                      Logout
                    </button>
                  </div>
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
              </>
            ) : (
              // Non-authenticated navigation menu
              <div className="flex items-center space-x-4">
                {location.pathname === '/login' ? (
                  <button
                    onClick={() => setIsFeedbackOpen(true)}
                    className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                  >
                    Send Feedback
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                  >
                    Login
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {isAuthenticated && isMobileMenuOpen && (
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
                  navigate('/profile');
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
                <div className="flex items-center space-x-3">
                  <div className="relative w-10 h-10 overflow-hidden bg-gray-200 dark:bg-gray-700 rounded-full">
                    <img
                      src={user?.avatar_url}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span>{user?.login}</span>
                </div>
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
        )}
      </nav>

      <div className="flex-1 flex overflow-hidden pt-12">
        <main className="w-full max-w-full">
          {children || <Outlet />}
        </main>
      </div>
      <FeedbackModal 
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />
    </div>
  );
};

export default Layout; 