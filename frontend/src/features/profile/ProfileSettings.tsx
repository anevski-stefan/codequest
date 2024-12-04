import { useState } from 'react';

const ProfileSettings = () => {
  const [notifications, setNotifications] = useState({
    email: true,
    browser: false,
  });

  const [theme, setTheme] = useState('light');

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-6">Settings</h3>
      
      {/* Notifications Section */}
      <div className="mb-8">
        <h4 className="text-md font-medium mb-4">Notifications</h4>
        <div className="space-y-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={notifications.email}
              onChange={(e) => setNotifications(prev => ({
                ...prev,
                email: e.target.checked
              }))}
              className="form-checkbox h-5 w-5 text-blue-600 rounded"
            />
            <span className="text-gray-700">Email notifications</span>
          </label>
          
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={notifications.browser}
              onChange={(e) => setNotifications(prev => ({
                ...prev,
                browser: e.target.checked
              }))}
              className="form-checkbox h-5 w-5 text-blue-600 rounded"
            />
            <span className="text-gray-700">Browser notifications</span>
          </label>
        </div>
      </div>

      {/* Theme Section */}
      <div className="mb-8">
        <h4 className="text-md font-medium mb-4">Theme</h4>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
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