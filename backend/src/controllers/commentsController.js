const githubService = require('../services/githubService');
const { isValidOwner, isValidRepo, isValidNumber } = require('../utils/validateParams');
const { badRequest, asyncHandler } = require('../utils/httpError');
const { buildPagination, clampPage } = require('../utils/pagination');

const PER_PAGE = 30;

exports.getIssueComments = asyncHandler(async (req, res) => {
  const {
    issueNumber
  } = req.params;
  const {
    owner,
    repo,
    page = '1'
  } = req.query;
  if (!isValidOwner(owner) || !isValidRepo(repo) || !isValidNumber(issueNumber)) {
    return badRequest(res, 'Invalid owner, repo or issue number');
  }
  const pageNum = clampPage(page);
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
  res.json({
    comments,
    count: comments.length,
    ...buildPagination({ page: pageNum, perPage: PER_PAGE, linkHeader: response.headers.link })
  });
});