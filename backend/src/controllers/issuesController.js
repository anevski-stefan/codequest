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
    const transformedIssues = data.items.map(item => ({
      id: item.id,
      number: item.number,
      title: item.title,
      body: item.body,
      state: item.state,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      commentsCount: item.comments,
      labels: item.labels.map(label => ({
        name: label.name,
        color: label.color
      })),
      repository: item.repository_url ? {
        id: item.repository_url.split('/').pop(),
        fullName: item.repository_url.split('/').slice(-2).join('/'),
        url: item.html_url
      } : null,
      user: {
        login: item.user.login,
        avatarUrl: item.user.avatar_url
      },
      url: item.html_url
    }));
    res.json(transformedIssues);
  } catch (error) {
    console.error('Error fetching assigned issues:', error);
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