const axios = require('axios');

exports.getIssueComments = async (req, res) => {
  try {
    const { issueNumber } = req.params;
    const { owner, repo } = req.query;

    if (!owner || !repo) {
      return res.status(400).json({ error: 'Owner and repo are required' });
    }

    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      {
        headers: {
          Authorization: `token ${req.user.accessToken}`,
          Accept: 'application/vnd.github.v3+json'
        }
      }
    );

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


    res.json({
      comments,
      totalCount: comments.length,
      hasMore: false,
      nextPage: null
    });
  } catch (error) {
    console.error('Error fetching comments:', error.response?.data);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.message || 'Failed to fetch comments'
    });
  }
}; 