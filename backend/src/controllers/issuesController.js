const githubService = require('../services/githubService');
const logger = require('../utils/logger');
const { githubErrorResponse } = require('../utils/githubError');
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
    logger.error('Error fetching assigned issues:', error.message, error.response?.data);
    if (error.request && !error.response) {
      return res.status(503).json({
        error: 'Unable to reach GitHub API'
      });
    }
    return githubErrorResponse(res, error, 'Failed to fetch assigned issues');
  }
};