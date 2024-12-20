import { useSelector } from 'react-redux';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Settings, FileText } from 'lucide-react';
import type { RootState } from '../../store';

const Profile = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const location = useLocation();
  const navigate = useNavigate();

  const navigationItems = [
    { icon: FileText, label: 'Assigned Issues', path: '/profile/assigned' },
    { icon: Activity, label: 'Activity', path: '/profile/activity' },
    { icon: Settings, label: 'Settings', path: '/profile/settings' },
  ];

  // Redirect to assigned issues if on root profile path
  if (location.pathname === '/profile') {
    navigate('/profile/assigned');
    return null;
  }

  return (
    <div className="flex flex-col md:flex-row flex-1 dark:bg-[#0B1222] mt-8">
      {/* Side Navigation - Mobile Dropdown */}
      <div className="md:hidden px-4 mb-4">
        <select
          onChange={(e) => navigate(e.target.value)}
          value={location.pathname}
          className="w-full p-2 border rounded-lg bg-white/80 dark:bg-black/20 backdrop-blur-lg text-gray-900 dark:text-white border-gray-200 dark:border-white/10"
        >
          {navigationItems.map((item) => (
            <option key={item.path} value={item.path} className="bg-white dark:bg-[#0B1222]">
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {/* Side Navigation - Desktop */}
      <div className="hidden md:block w-64 shrink-0 dark:bg-[#0B1222] border-r border-gray-200 dark:border-white/10">
        <div className="p-6">
          <div className="flex flex-col items-center">
            <img
              src={user?.avatar_url}
              alt="Profile"
              className="w-24 h-24 rounded-full border-2 border-gray-200 dark:border-white/10"
            />
            <h2 className="mt-4 text-xl font-semibold dark:text-white">{user?.login}</h2>
            <p className="text-gray-600 dark:text-gray-400">{user?.email}</p>
          </div>
          <nav className="mt-8">
            <ul className="space-y-2">
              {navigationItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center px-4 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-50/50 dark:bg-white/5 text-blue-600 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-white/5'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 p-4 md:p-6 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default Profile; 