const githubService = require('../services/githubService');
const { sendError, asyncHandler } = require('../utils/httpError');
exports.getAssignedIssues = asyncHandler(async (req, res) => {
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
});