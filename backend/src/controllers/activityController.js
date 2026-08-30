const githubService = require('../services/githubService');
exports.getActivity = async (req, res) => {
  try {
    const activities = (await githubService.request(req.user.accessToken, 'GET', '/user/events')).map(event => ({
      id: event.id,
      type: event.type,
      repo: event.repo.name,
      date: event.created_at,
      payload: event.payload
    }));
    res.json(activities);
  } catch (error) {
    console.error('Error fetching activity:', error.response?.data);
    res.status(500).json({
      error: 'Failed to fetch activity'
    });
  }
};