import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const ProfileSettings = () => {
  const { theme: currentTheme, setTheme } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);

  const handleSaveChanges = () => {
    // Apply theme change
    setTheme(selectedTheme);
    console.log('Settings saved:', { theme: selectedTheme });
  };

  return (
    <div className="bg-white/80 dark:bg-[#0B1222]/80 backdrop-blur-lg rounded-lg shadow p-6 border border-gray-200 dark:border-white/10">
      <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white">Settings</h3>
      
      {/* Theme Section */}
      <div className="mb-8">
        <h4 className="text-md font-medium mb-4 text-gray-900 dark:text-white">Theme</h4>
        <select
          value={selectedTheme}
          onChange={(e) => setSelectedTheme(e.target.value as 'light' | 'dark' | 'system')}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm rounded-lg bg-white/80 dark:bg-black/20 backdrop-blur-lg text-gray-900 dark:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors"
        >
          <option value="light" className="bg-white dark:bg-gray-800">Light</option>
          <option value="dark" className="bg-white dark:bg-gray-800">Dark</option>
          <option value="system" className="bg-white dark:bg-gray-800">System</option>
        </select>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="button"
          className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors shadow-sm"
          onClick={handleSaveChanges}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default ProfileSettings; 