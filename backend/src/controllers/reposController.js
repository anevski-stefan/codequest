const githubService = require('../services/githubService');
const { getMergeLikelihood } = require('../services/mergeLikelihoodService');
const { badRequest, asyncHandler } = require('../utils/httpError');
const { buildPagination, clampPage } = require('../utils/pagination');
const { isValidNumber, isValidState } = require('../utils/validateParams');
const MAX_COMMENT_BODY_LENGTH = 65536;
exports.createComment = asyncHandler(async (req, res) => {
  const {
    owner,
    repo,
    number
  } = req.params;
  if (!isValidNumber(number)) {
    return badRequest(res, 'Invalid issue number');
  }
  const {
    body
  } = req.body;
  if (!body) {
    return sendError(res, 422, 'Validation Failed', [{
      resource: 'IssueComment',
      field: 'body',
      code: 'missing_field'
    }]);
  }
  if (typeof body !== 'string' || body.length > MAX_COMMENT_BODY_LENGTH) {
    return sendError(res, 422, 'Validation Failed', [{
      resource: 'IssueComment',
      field: 'body',
      code: 'too_long'
    }]);
  }
  const response = await githubService.request(req.user.accessToken, 'POST', `/repos/${owner}/${repo}/issues/${number}/comments`, {
    data: { body },
    contentType: 'application/json'
  });
  res.status(201).json(response);
});
exports.checkRepoStarred = asyncHandler(async (req, res) => {
  const { owner, repo } = req.params;
  try {
    await githubService.request(req.user.accessToken, 'GET', `/user/starred/${owner}/${repo}`);
    res.json({ starred: true });
  } catch (err) {
    if (err.status === 404 || err.response?.status === 404) return res.json({ starred: false });
    throw err;
  }
});

exports.starRepo = asyncHandler(async (req, res) => {
  const { owner, repo } = req.params;
  await githubService.request(req.user.accessToken, 'PUT', `/user/starred/${owner}/${repo}`, {
    data: '',
    headers: { 'Content-Length': '0' },
  });
  githubService.invalidate(req.user.accessToken, `/user/starred/${owner}/${repo}`);
  res.status(204).end();
});

exports.unstarRepo = asyncHandler(async (req, res) => {
  const { owner, repo } = req.params;
  await githubService.request(req.user.accessToken, 'DELETE', `/user/starred/${owner}/${repo}`);
  githubService.invalidate(req.user.accessToken, `/user/starred/${owner}/${repo}`);
  res.status(204).end();
});

exports.getRepoDetails = asyncHandler(async (req, res) => {
  const { owner, repo } = req.params;
  const response = await githubService.request(req.user.accessToken, 'GET', `/repos/${owner}/${repo}`);
  res.json(response);
});
exports.getRepoContributors = asyncHandler(async (req, res) => {
  const { owner, repo } = req.params;
  const response = await githubService.request(req.user.accessToken, 'GET', `/repos/${owner}/${repo}/stats/contributors`);
  if (!Array.isArray(response)) return res.json([]);
  const contributors = response.map(contributor => ({
    login: contributor.author.login,
    avatar_url: contributor.author.avatar_url,
    contributions: contributor.total,
    percentage: 0
  })).sort((a, b) => b.contributions - a.contributions);
  const total = contributors.reduce((sum, c) => sum + c.contributions, 0);
  contributors.forEach(c => c.percentage = Math.round(c.contributions / total * 100));
  res.json(contributors.slice(0, 5));
});
exports.getLotteryContributors = asyncHandler(async (req, res) => {
  const { owner, repo } = req.params;
  const response = await githubService.request(req.user.accessToken, 'GET', `/repos/${owner}/${repo}/pulls`, {
    params: { state: 'all', per_page: 100 }
  });
  const pullRequests = response;
  const contributorCounts = {};
  pullRequests.forEach(pr => {
    const login = pr.user.login;
    if (!contributorCounts[login]) {
      contributorCounts[login] = {
        count: 0,
        avatar_url: pr.user.avatar_url
      };
    }
    contributorCounts[login].count++;
  });
  const contributors = Object.entries(contributorCounts).map(([login, data]) => ({
    login,
    avatar_url: data.avatar_url,
    pull_requests: data.count,
    percentage: 0
  })).sort((a, b) => b.pull_requests - a.pull_requests);
  const total = contributors.reduce((sum, c) => sum + c.pull_requests, 0);
  contributors.forEach(c => c.percentage = Math.round(c.pull_requests / total * 100));
  res.json(contributors.slice(0, 4));
});
exports.getMergeLikelihood = asyncHandler(async (req, res) => {
  const { owner, repo } = req.params;
  res.json(await getMergeLikelihood(req.user.accessToken, owner, repo));
});
exports.getPulls = asyncHandler(async (req, res) => {
  const { owner, repo } = req.params;
  const { state = 'open', page = 1 } = req.query;
  const pageNum = clampPage(page);
  if (!isValidState(state)) {
    return badRequest(res, 'Invalid state; must be open, closed or all');
  }
  const perPage = 30;
  const { data: pullRequestsItems, headers } = await githubService.request(req.user.accessToken, 'GET', `/repos/${owner}/${repo}/pulls`, {
    params: { state, page: pageNum, per_page: perPage },
    fullResponse: true,
  });
  const linkHeader = headers?.link || '';
  const lastMatch = linkHeader.match(/[?&]page=(\d+)[^>]*>;\s*rel="last"/);
  const lastPage = lastMatch ? parseInt(lastMatch[1], 10) : pageNum;
  const totalCount = lastPage * perPage;
  const pullRequestsWithDetails = pullRequestsItems.map(pr => ({
    id: pr.id,
    number: pr.number,
    title: pr.title,
    state: pr.state,
    created_at: pr.created_at,
    updated_at: pr.updated_at,
    closed_at: pr.closed_at,
    merged_at: pr.merged_at,
    draft: pr.draft,
    user: {
      login: pr.user.login,
      avatar_url: pr.user.avatar_url
    },
    labels: pr.labels,
    requested_reviewers: pr.requested_reviewers,
    head: {
      ref: pr.head.ref,
      sha: pr.head.sha
    },
    base: {
      ref: pr.base.ref
    },
    commits: pr.commits || 0,
    additions: pr.additions || 0,
    deletions: pr.deletions || 0,
    changed_files: pr.changed_files || 0,
    comments: pr.comments || 0,
    review_comments: pr.review_comments || 0
  }));
  res.json({
    pullRequests: pullRequestsWithDetails,
    ...buildPagination({ page: pageNum, perPage, totalCount }),
    totalCount
  });
});
exports.getPullDetails = asyncHandler(async (req, res) => {
  const { owner, repo, pullNumber } = req.params;
  if (!isValidNumber(pullNumber)) {
    return badRequest(res, 'Invalid pull request number');
  }
  const [response, filesResponse, commitsResponse] = await Promise.all([
    githubService.request(req.user.accessToken, 'GET', `/repos/${owner}/${repo}/pulls/${pullNumber}`),
    githubService.request(req.user.accessToken, 'GET', `/repos/${owner}/${repo}/pulls/${pullNumber}/files`),
    githubService.request(req.user.accessToken, 'GET', `/repos/${owner}/${repo}/pulls/${pullNumber}/commits`)
  ]);
  const prFileNames = filesResponse.map(file => file.filename);
  const commitsWithFiles = commitsResponse.map(commit => ({
    sha: commit.sha,
    commit: {
      message: commit.commit.message,
      author: commit.commit.author
    },
    author: commit.author,
    files: prFileNames
  }));
  const details = {
    number: response.number,
    title: response.title,
    state: response.state,
    created_at: response.created_at,
    updated_at: response.updated_at,
    merged_at: response.merged_at,
    closed_at: response.closed_at,
    user: {
      login: response.user.login,
      avatar_url: response.user.avatar_url
    },
    files: filesResponse.map(file => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patch: file.patch
    })),
    commits: response.commits,
    additions: response.additions,
    deletions: response.deletions,
    changed_files: response.changed_files,
    comments: response.comments,
    review_comments: response.review_comments,
    commits_data: commitsWithFiles
  };
  res.json(details);
});