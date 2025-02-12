const axios = require('axios');

exports.createComment = async (req, res) => {
  try {
    const { owner, repo, number } = req.params;
    const { body } = req.body;

    console.log('Creating comment:', {
      owner,
      repo,
      issueNumber: number,
      body,
      token: req.user.accessToken ? 'present' : 'missing',
      requestBody: req.body,
      headers: req.headers,
      params: req.params
    });

    if (!body) {
      return res.status(422).json({ 
        message: 'Validation Failed',
        errors: [{ resource: 'IssueComment', field: 'body', code: 'missing_field' }]
      });
    }

    // Create comment using GitHub's API
    const response = await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/issues/${number}/comments`,
      { body },
      {
        headers: {
          Authorization: `token ${req.user.accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('GitHub API Response:', {
      status: response.status,
      data: response.data,
      headers: response.headers
    });

    // GitHub returns 201 for successful creation
    res.status(201).json(response.data);
  } catch (error) {
    console.error('Error creating comment:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers,
      requestConfig: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
        data: error.config?.data
      }
    });
    
    // Forward GitHub's status codes
    if (error.response?.status === 404) {
      return res.status(404).json({ message: 'Issue not found' });
    }
    
    if (error.response?.status === 403) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    if (error.response?.status === 422) {
      return res.status(422).json(error.response.data);
    }
    
    res.status(500).json({ 
      message: error.response?.data?.message || error.message || 'Failed to create comment',
      details: process.env.NODE_ENV === 'development' ? {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      } : undefined
    });
  }
};

exports.getRepoDetails = async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Authorization: `token ${req.user.accessToken}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching repository:', error.response?.data);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.message || 'Failed to fetch repository'
    });
  }
};

exports.getRepoContributors = async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/stats/contributors`,
      {
        headers: {
          Authorization: `token ${req.user.accessToken}`,
          Accept: 'application/vnd.github.v3+json'
        }
      }
    );
    
    // Process and sort contributors
    const contributors = response.data
      .map(contributor => ({
        login: contributor.author.login,
        avatar_url: contributor.author.avatar_url,
        contributions: contributor.total,
        percentage: 0
      }))
      .sort((a, b) => b.contributions - a.contributions);
    
    // Calculate percentages
    const total = contributors.reduce((sum, c) => sum + c.contributions, 0);
    contributors.forEach(c => c.percentage = Math.round((c.contributions / total) * 100));
    
    res.json(contributors.slice(0, 5));
  } catch (error) {
    console.error('Error fetching contributors:', error.response?.data);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.message || 'Failed to fetch contributors'
    });
  }
};

exports.getLotteryContributors = async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=100`,
      {
        headers: {
          Authorization: `token ${req.user.accessToken}`,
          Accept: 'application/vnd.github.v3+json'
        }
      }
    );
    
    const pullRequests = response.data;
    const contributorCounts = {};
    
    pullRequests.forEach(pr => {
      const login = pr.user.login;
      if (!contributorCounts[login]) {
        contributorCounts[login] = { count: 0, avatar_url: pr.user.avatar_url };
      }
      contributorCounts[login].count++;
    });
    
    const contributors = Object.entries(contributorCounts)
      .map(([login, data]) => ({
        login,
        avatar_url: data.avatar_url,
        pull_requests: data.count,
        percentage: 0
      }))
      .sort((a, b) => b.pull_requests - a.pull_requests);
    
    const total = contributors.reduce((sum, c) => sum + c.pull_requests, 0);
    contributors.forEach(c => c.percentage = Math.round((c.pull_requests / total) * 100));
    
    res.json(contributors.slice(0, 4));
  } catch (error) {
    console.error('Error fetching lottery contributors:', error.response?.data);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.message || 'Failed to fetch lottery contributors'
    });
  }
};

exports.getContributorConfidence = async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const [contributorsResponse, commitsResponse, prResponse] = await Promise.all([
      axios.get(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=100`, {
        headers: { Authorization: `token ${req.user.accessToken}` }
      }),
      axios.get(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=100`, {
        headers: { Authorization: `token ${req.user.accessToken}` }
      }),
      axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=100`, {
        headers: { Authorization: `token ${req.user.accessToken}` }
      })
    ]);

    const contributors = contributorsResponse.data;
    const commits = commitsResponse.data;
    const prs = prResponse.data;

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
      activeContributor: Math.min((activeContributors / totalContributors) * 100, 100),
      recentActivity: Math.min((recentCommits / 100) * 100, 100),
      prSuccess: Math.min((mergedPRs / prs.length) * 100 || 0, 100),
      contributorDiversity: Math.min((uniquePRAuthors / totalContributors) * 100, 100)
    };

    const confidenceScore = Math.round(
      scores.activeContributor * weights.activeContributorsRatio +
      scores.recentActivity * weights.recentActivityRatio +
      scores.prSuccess * weights.prSuccessRatio +
      scores.contributorDiversity * weights.contributorDiversityRatio
    );

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
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.message || 'Failed to calculate contributor confidence'
    });
  }
};

exports.getPulls = async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { state = 'open', page = 1 } = req.query;
    const perPage = 30;
    
    // Get total count based on state using search API
    const searchResponse = await axios.get(
      `https://api.github.com/search/issues?q=repo:${owner}/${repo}+is:pr+state:${state}`,
      {
        headers: {
          Authorization: `token ${req.user.accessToken}`,
          Accept: 'application/vnd.github.v3+json'
        }
      }
    );

    const totalCount = searchResponse.data.total_count;

    // Get pull requests for the current page
    const pullRequestsResponse = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        params: {
          state,
          page,
          per_page: perPage
        },
        headers: {
          Authorization: `token ${req.user.accessToken}`,
          Accept: 'application/vnd.github.v3+json'
        }
      }
    );

    // Fetch detailed information for each PR
    const pullRequestsWithDetails = await Promise.all(
      pullRequestsResponse.data.map(async (pr) => {
        const detailsResponse = await axios.get(
          pr.url,
          {
            headers: {
              Authorization: `token ${req.user.accessToken}`,
              Accept: 'application/vnd.github.v3+json'
            }
          }
        );
        
        return {
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
          commits: detailsResponse.data.commits || 0,
          additions: detailsResponse.data.additions || 0,
          deletions: detailsResponse.data.deletions || 0,
          changed_files: detailsResponse.data.changed_files || 0,
          comments: pr.comments || 0,
          review_comments: pr.review_comments || 0
        };
      })
    );

    const hasMore = page * perPage < totalCount;

    res.json({
      pullRequests: pullRequestsWithDetails,
      hasMore,
      totalCount
    });
  } catch (error) {
    console.error('Error fetching pull requests:', error.response?.data);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.message || 'Failed to fetch pull requests'
    });
  }
};

exports.getPullDetails = async (req, res) => {
  try {
    const { owner, repo, pullNumber } = req.params;
    
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`,
      {
        headers: {
          Authorization: `token ${req.user.accessToken}`,
          Accept: 'application/vnd.github.v3+json'
        }
      }
    );

    // Get the files changed in this PR
    const filesResponse = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/files`,
      {
        headers: {
          Authorization: `token ${req.user.accessToken}`,
          Accept: 'application/vnd.github.v3+json'
        }
      }
    );

    const commitsResponse = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/commits`,
      {
        headers: {
          Authorization: `token ${req.user.accessToken}`,
          Accept: 'application/vnd.github.v3+json'
        }
      }
    );

    // Get files for each commit
    const commitsWithFiles = await Promise.all(commitsResponse.data.map(async (commit) => {
      const commitFiles = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/commits/${commit.sha}`,
        {
          headers: {
            Authorization: `token ${req.user.accessToken}`,
            Accept: 'application/vnd.github.v3+json'
          }
        }
      );
      
      return {
        sha: commit.sha,
        commit: {
          message: commit.commit.message,
          author: commit.commit.author
        },
        author: commit.author,
        files: commitFiles.data.files.map(file => file.filename)
      };
    }));

    const details = {
      number: response.data.number,
      title: response.data.title,
      state: response.data.state,
      created_at: response.data.created_at,
      updated_at: response.data.updated_at,
      merged_at: response.data.merged_at,
      closed_at: response.data.closed_at,
      user: {
        login: response.data.user.login,
        avatar_url: response.data.user.avatar_url
      },
      files: filesResponse.data.map(file => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch
      })),
      commits: response.data.commits,
      additions: response.data.additions,
      deletions: response.data.deletions,
      changed_files: response.data.changed_files,
      comments: response.data.comments,
      review_comments: response.data.review_comments,
      commits_data: commitsWithFiles
    };

    res.json(details);
  } catch (error) {
    console.error('Error fetching pull request details:', error);
    res.status(500).json({ error: 'Failed to fetch pull request details' });
  }
}; 