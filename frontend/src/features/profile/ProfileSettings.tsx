import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const ProfileSettings = () => {
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState({
    email: true,
    browser: false,
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white">Settings</h3>
      
      {/* Notifications Section */}
      <div className="mb-8">
        <h4 className="text-md font-medium mb-4 text-gray-900 dark:text-white">Notifications</h4>
        <div className="space-y-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={notifications.email}
              onChange={(e) => setNotifications(prev => ({
                ...prev,
                email: e.target.checked
              }))}
              className="form-checkbox h-5 w-5 text-blue-600 rounded dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="text-gray-700 dark:text-gray-300">Email notifications</span>
          </label>
          
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={notifications.browser}
              onChange={(e) => setNotifications(prev => ({
                ...prev,
                browser: e.target.checked
              }))}
              className="form-checkbox h-5 w-5 text-blue-600 rounded dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="text-gray-700 dark:text-gray-300">Browser notifications</span>
          </label>
        </div>
      </div>

      {/* Theme Section */}
      <div className="mb-8">
        <h4 className="text-md font-medium mb-4 text-gray-900 dark:text-white">Theme</h4>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="button"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          onClick={() => {
            // Handle saving settings
            console.log('Settings saved:', { notifications, theme });
          }}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default ProfileSettings; 