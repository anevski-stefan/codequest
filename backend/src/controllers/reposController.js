const githubService = require('../services/githubService');
const { githubErrorResponse } = require('../utils/githubError');
const { badRequest, notFound, forbidden, sendError } = require('../utils/httpError');
const { isValidOwner, isValidRepo, isValidNumber, isValidState } = require('../utils/validateParams');
exports.createComment = async (req, res) => {
  try {
    const {
      owner,
      repo,
      number
    } = req.params;
    if (!isValidOwner(owner) || !isValidRepo(repo) || !isValidNumber(number)) {
      return badRequest(res, 'Invalid owner, repo or issue number');
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
    const response = await githubService.request(req.user.accessToken, 'POST', `/repos/${owner}/${repo}/issues/${number}/comments`, {
      data: { body },
      contentType: 'application/json'
    });
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating comment:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method
    });
    if (error.response?.status === 404) {
      return notFound(res, 'Issue not found');
    }
    if (error.response?.status === 403) {
      return forbidden(res, 'Forbidden');
    }
    if (error.response?.status === 422) {
      return sendError(res, 422, 'Could not create comment');
    }
    res.status(500).json({
      error: 'Failed to create comment'
    });
  }
};
exports.getRepoDetails = async (req, res) => {
  try {
    const {
      owner,
      repo
    } = req.params;
    if (!isValidOwner(owner) || !isValidRepo(repo)) {
      return res.status(400).json({
        error: 'Invalid owner or repo'
      });
    }
    const response = await githubService.request(req.user.accessToken, 'GET', `/repos/${owner}/${repo}`);
    res.json(response);
  } catch (error) {
    console.error('Error fetching repository:', error.response?.data);
    return githubErrorResponse(res, error, 'Failed to fetch repository');
  }
};
exports.getRepoContributors = async (req, res) => {
  try {
    const {
      owner,
      repo
    } = req.params;
    if (!isValidOwner(owner) || !isValidRepo(repo)) {
      return res.status(400).json({
        error: 'Invalid owner or repo'
      });
    }
    const response = await githubService.request(req.user.accessToken, 'GET', `/repos/${owner}/${repo}/stats/contributors`);
    const contributors = response.map(contributor => ({
      login: contributor.author.login,
      avatar_url: contributor.author.avatar_url,
      contributions: contributor.total,
      percentage: 0
    })).sort((a, b) => b.contributions - a.contributions);
    const total = contributors.reduce((sum, c) => sum + c.contributions, 0);
    contributors.forEach(c => c.percentage = Math.round(c.contributions / total * 100));
    res.json(contributors.slice(0, 5));
  } catch (error) {
    console.error('Error fetching contributors:', error.response?.data);
    return githubErrorResponse(res, error, 'Failed to fetch contributors');
  }
};
exports.getLotteryContributors = async (req, res) => {
  try {
    const {
      owner,
      repo
    } = req.params;
    if (!isValidOwner(owner) || !isValidRepo(repo)) {
      return res.status(400).json({
        error: 'Invalid owner or repo'
      });
    }
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
  } catch (error) {
    console.error('Error fetching lottery contributors:', error.response?.data);
    return githubErrorResponse(res, error, 'Failed to fetch lottery contributors');
  }
};
exports.getContributorConfidence = async (req, res) => {
  try {
    const {
      owner,
      repo
    } = req.params;
    if (!isValidOwner(owner) || !isValidRepo(repo)) {
      return res.status(400).json({
        error: 'Invalid owner or repo'
      });
    }
    const [contributorsResponse, commitsResponse, prResponse] = await Promise.all([
      githubService.request(req.user.accessToken, 'GET', `/repos/${owner}/${repo}/contributors`, { params: { per_page: 100 } }),
      githubService.request(req.user.accessToken, 'GET', `/repos/${owner}/${repo}/commits`, { params: { per_page: 100 } }),
      githubService.request(req.user.accessToken, 'GET', `/repos/${owner}/${repo}/pulls`, { params: { state: 'all', per_page: 100 } })
    ]);
    const contributors = contributorsResponse;
    const commits = commitsResponse;
    const prs = prResponse;
    const totalContributors = contributors.length;
    const activeContributors = contributors.filter(c => c.contributions >= 10).length;
    const recentCommits = commits.filter(c => {
      const commitDate = new Date(c.commit.author.date);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return commitDate > threeMonthsAgo;
    }).length;
    const mergedPRs = prs.filter(pr => pr.merged_at).length;
    const uniquePRAuthors = new Set(prs.map(pr => pr.user.login)).size;
    const weights = {
      activeContributorsRatio: 0.3,
      recentActivityRatio: 0.3,
      prSuccessRatio: 0.2,
      contributorDiversityRatio: 0.2
    };
    const scores = {
      activeContributor: Math.min(activeContributors / totalContributors * 100, 100),
      recentActivity: Math.min(commits.length ? recentCommits / commits.length * 100 : 0, 100),
      prSuccess: Math.min(mergedPRs / prs.length * 100 || 0, 100),
      contributorDiversity: Math.min(uniquePRAuthors / totalContributors * 100, 100)
    };
    const confidenceScore = Math.round(scores.activeContributor * weights.activeContributorsRatio + scores.recentActivity * weights.recentActivityRatio + scores.prSuccess * weights.prSuccessRatio + scores.contributorDiversity * weights.contributorDiversityRatio);
    let message = "Few stargazers and forkers come back later on to a meaningful contribution.";
    if (confidenceScore >= 75) {
      message = "Strong and active contributor community with consistent engagement.";
    } else if (confidenceScore >= 50) {
      message = "Moderate contributor activity with room for growth.";
    }
    res.json({
      percentage: confidenceScore,
      message
    });
  } catch (error) {
    console.error('Error calculating contributor confidence:', error.response?.data);
    return githubErrorResponse(res, error, 'Failed to calculate contributor confidence');
  }
};
exports.getPulls = async (req, res) => {
  try {
    const {
      owner,
      repo
    } = req.params;
    const {
      state = 'open',
      page = 1
    } = req.query;
    if (!isValidOwner(owner) || !isValidRepo(repo)) {
      return res.status(400).json({
        error: 'Invalid owner or repo'
      });
    }
    if (!isValidState(state)) {
      return res.status(400).json({
        error: 'Invalid state; must be open, closed or all'
      });
    }
    const perPage = 30;
    const searchResponse = await githubService.request(req.user.accessToken, 'GET', `/search/issues?q=repo:${owner}/${repo}+is:pr+state:${state}`);
    const totalCount = searchResponse.total_count;
    const pullRequestsResponse = await githubService.request(req.user.accessToken, 'GET', `/repos/${owner}/${repo}/pulls`, {
      params: {
        state,
        page,
        per_page: perPage
      }
    });
    const pullRequestsWithDetails = pullRequestsResponse.map(pr => ({
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
    const hasMore = page * perPage < totalCount;
    res.json({
      pullRequests: pullRequestsWithDetails,
      hasMore,
      totalCount
    });
  } catch (error) {
    console.error('Error fetching pull requests:', error.response?.data);
    return githubErrorResponse(res, error, 'Failed to fetch pull requests');
  }
};
exports.getPullDetails = async (req, res) => {
  try {
    const {
      owner,
      repo,
      pullNumber
    } = req.params;
    if (!isValidOwner(owner) || !isValidRepo(repo) || !isValidNumber(pullNumber)) {
      return res.status(400).json({
        error: 'Invalid owner, repo or pull request number'
      });
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
  } catch (error) {
    console.error('Error fetching pull request details:', error.message, error.response?.data);
    return githubErrorResponse(res, error, 'Failed to fetch pull request details');
  }
};