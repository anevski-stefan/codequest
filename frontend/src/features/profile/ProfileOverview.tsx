const ProfileOverview = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-600">Total Contributions</h4>
            <p className="text-2xl font-bold text-blue-800">1,234</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="text-sm font-medium text-green-600">Open Issues</h4>
            <p className="text-2xl font-bold text-green-800">42</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <h4 className="text-sm font-medium text-purple-600">Pull Requests</h4>
            <p className="text-2xl font-bold text-purple-800">56</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileOverview; 