const githubService = require('../services/githubService');
exports.getAssignedIssues = async (req, res) => {
  try {
    const {
      state
    } = req.query;
    const queryState = state === 'closed' ? 'is:closed' : 'is:open';
    const query = `is:issue ${queryState} assignee:@me`;
    const data = await githubService.searchIssues(req.user.accessToken, query, {
      per_page: 30,
      sort: 'updated',
      order: 'desc'
    });
    if (!data) {
      throw new Error('No data received from GitHub API');
    }
    res.json(data.items || []);
  } catch (error) {
    console.error('Error fetching assigned issues:', error.message, error.response?.data);
    if (error.response) {
      return res.status(error.response.status).json({
        error: error.response.data.message || 'GitHub API error'
      });
    } else if (error.request) {
      return res.status(503).json({
        error: 'Unable to reach GitHub API'
      });
    }
    res.status(500).json({
      error: 'Internal server error while fetching assigned issues'
    });
  }
};