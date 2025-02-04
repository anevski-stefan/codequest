import { useState } from 'react';
import { Settings } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { usePageTitle } from '../../hooks/usePageTitle';

const SettingsPage = () => {
  usePageTitle('Settings');
  const { theme: currentTheme, setTheme } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);

  const handleSaveChanges = () => {
    setTheme(selectedTheme);
    console.log('Settings saved:', { theme: selectedTheme });
  };

  return (
    <div className="flex flex-col flex-1 dark:bg-[#0B1222] mt-8 p-4 md:p-6">
      <div className="bg-white dark:bg-[#0B1222] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-white/10">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
          <Settings className="w-5 h-5" />
          Settings
        </h2>
        
        {/* Theme Section */}
        <div className="mb-8">
          <h4 className="text-md font-medium mb-4 text-gray-900 dark:text-white">Theme</h4>
          <select
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value as 'light' | 'dark' | 'system')}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm rounded-lg bg-white dark:bg-[#0B1222] text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
          >
            <option value="light" className="bg-white dark:bg-[#0B1222]">Light</option>
            <option value="dark" className="bg-white dark:bg-[#0B1222]">Dark</option>
            <option value="system" className="bg-white dark:bg-[#0B1222]">System</option>
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
    </div>
  );
};

export default SettingsPage; 