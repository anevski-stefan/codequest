const ProfileOverview = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 dark:text-white">Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Contributions</h4>
            <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">1,234</p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
            <h4 className="text-sm font-medium text-green-600 dark:text-green-400">Open Issues</h4>
            <p className="text-2xl font-bold text-green-800 dark:text-green-200">42</p>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
            <h4 className="text-sm font-medium text-purple-600 dark:text-purple-400">Pull Requests</h4>
            <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">56</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileOverview; 