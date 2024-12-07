import { useSelector } from 'react-redux';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { User, Activity, Settings, FileText } from 'lucide-react';
import ContributionGraph from '../dashboard/components/ContributionGraph';
import type { RootState } from '../../store';

const Profile = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const location = useLocation();
  const navigate = useNavigate();

  const navigationItems = [
    { icon: User, label: 'Overview', path: '/profile' },
    { icon: FileText, label: 'Assigned Issues', path: '/profile/assigned' },
    { icon: Activity, label: 'Activity', path: '/profile/activity' },
    { icon: Settings, label: 'Settings', path: '/profile/settings' },
  ];

  const contributionData = Array.from({ length: 52 }, () => 
    Math.floor(Math.random() * 10)
  );

  const isMainProfile = location.pathname === '/profile';

  return (
    <div className="flex flex-col md:flex-row flex-1 bg-gray-50 dark:bg-gray-800 mt-8">
      {/* Side Navigation - Mobile Dropdown */}
      <div className="md:hidden px-4 mb-4">
        <select
          onChange={(e) => navigate(e.target.value)}
          value={location.pathname}
          className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          {navigationItems.map((item) => (
            <option key={item.path} value={item.path}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {/* Side Navigation - Desktop */}
      <div className="hidden md:block w-64 bg-white dark:bg-gray-800 shadow-sm border-r border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex flex-col items-center">
            <img
              src={user?.avatar_url}
              alt="Profile"
              className="w-24 h-24 rounded-full border-2 border-gray-200 dark:border-gray-600"
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
                    end={item.path === '/profile'}
                    className={({ isActive }) =>
                      `flex items-center px-4 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
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
      <div className="flex-1 p-4 md:p-6 bg-gray-50 dark:bg-gray-800 overflow-auto">
        <div className="w-full max-w-5xl mx-auto">
          {isMainProfile ? (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Contribution Activity
                </h3>
                <div className="overflow-x-auto">
                  <ContributionGraph data={contributionData} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                    Recent Activity
                  </h3>
                  {/* Add recent activity content */}
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                    Statistics
                  </h3>
                  {/* Add statistics content */}
                </div>
              </div>
            </>
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile; 