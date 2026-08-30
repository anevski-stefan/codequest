const githubService = require('../services/githubService');

const PER_PAGE = 30;

function hasNextPage(linkHeader) {
  if (!linkHeader) return false;
  return /rel="?next"?/.test(linkHeader);
}

exports.getIssueComments = async (req, res) => {
  try {
    const {
      issueNumber
    } = req.params;
    const {
      owner,
      repo,
      page = '1'
    } = req.query;
    if (!owner || !repo) {
      return res.status(400).json({
        error: 'Owner and repo are required'
      });
    }
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const response = await githubService.request(req.user.accessToken, 'GET', `/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
      params: { page: pageNum, per_page: PER_PAGE },
      fullResponse: true
    });
    const comments = response.data.map(comment => ({
      id: comment.id,
      body: comment.body,
      user: {
        login: comment.user.login,
        avatar_url: comment.user.avatar_url
      },
      createdAt: new Date(comment.created_at).toISOString(),
      updatedAt: new Date(comment.updated_at).toISOString()
    }));
    const hasMore = hasNextPage(response.headers.link);
    res.json({
      comments,
      totalCount: comments.length,
      hasMore,
      nextPage: hasMore ? pageNum + 1 : null
    });
  } catch (error) {
    console.error('Error fetching comments:', error.response?.data);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Failed to fetch comments'
    });
  }
};
