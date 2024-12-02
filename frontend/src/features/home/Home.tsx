const Home = () => {
  return (
    <div className="max-w-4xl mx-auto text-center">
      <h1 className="text-4xl font-bold mb-6">
        Track Your GitHub Contributions
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        Visualize and analyze your GitHub activity with our powerful contribution tracking tools.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-2">Contribution Analytics</h3>
          <p className="text-gray-600">Track your GitHub activity over time</p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-2">Repository Insights</h3>
          <p className="text-gray-600">Analyze your repository engagement</p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-2">Collaboration Metrics</h3>
          <p className="text-gray-600">Monitor your team contributions</p>
        </div>
      </div>
    </div>
  );
};

export default Home; 