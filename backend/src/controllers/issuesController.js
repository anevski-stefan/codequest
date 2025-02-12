const axios = require('axios');
const cache = require('memory-cache');
const githubService = require('../services/githubService');

exports.getIssues = async (req, res) => {
  try {
    const { language, sort, state, page, timeFrame } = req.query;
    const cacheKey = `issues-${language}-${sort}-${state}-${page}-${timeFrame}`;
    
    // Calculate the date threshold based on timeFrame
    let dateThreshold;
    const now = new Date();
    switch (timeFrame) {
      case 'day':
        dateThreshold = new Date(now.setDate(now.getDate() - 1));
        break;
      case 'week':
        dateThreshold = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        dateThreshold = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        dateThreshold = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        dateThreshold = null;
    }

    let q = `is:issue is:${state}`;
    if (language) {
      q += ` language:${language}`;
    }
    if (dateThreshold) {
      q += ` created:>=${dateThreshold.toISOString().split('T')[0]}`;
    }

    // Determine the sort parameter and order for GitHub API
    let sortParam = sort;
    let order = 'desc';

    switch (sort) {
      case 'newest':
        sortParam = 'created';
        order = 'desc';
        break;
      case 'oldest':
        sortParam = 'created';
        order = 'asc';
        break;
      case 'updated':
        sortParam = 'updated';
        order = 'desc';
        break;
      case 'comments':
        sortParam = 'comments';
        order = 'desc';
        break;
    }

    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const perPage = 20;
    const response = await axios.get('https://api.github.com/search/issues', {
      headers: {
        Authorization: `token ${req.user.accessToken}`,
        Accept: 'application/vnd.github.v3+json'
      },
      params: {
        q,
        sort: sortParam,
        order,
        per_page: perPage,
        page
      }
    });

    // Fetch detailed issue data including status for each issue
    const issuesWithDetails = await Promise.all(
      response.data.items.map(async (item) => {
        const [owner, repo] = item.repository_url.split('/').slice(-2);
        
        // Fetch detailed issue data
        const detailedIssue = await axios.get(
          `https://api.github.com/repos/${owner}/${repo}/issues/${item.number}`,
          {
            headers: {
              Authorization: `token ${req.user.accessToken}`,
              Accept: 'application/vnd.github.v3+json'
            }
          }
        );

        // Get the detailed state information
        let status = detailedIssue.data.state;
        if (status === 'closed' && detailedIssue.data.state_reason) {
          status = detailedIssue.data.state_reason === 'completed' ? 'completed' : 'not planned';
        }

        return {
          id: item.id,
          number: item.number,
          title: item.title,
          body: item.body,
          state: status,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          commentsCount: detailedIssue.data.comments,
          labels: item.labels.map(label => ({
            name: label.name,
            color: label.color
          })),
          repository: {
            id: owner + '/' + repo,
            fullName: `${owner}/${repo}`,
            url: item.repository_url
          },
          user: {
            login: item.user.login,
            avatarUrl: item.user.avatar_url
          },
          url: item.html_url,
          stateReason: detailedIssue.data.state_reason || null,
          closedAt: detailedIssue.data.closed_at || null,
          locked: detailedIssue.data.locked || false,
          draft: detailedIssue.data.draft || false
        };
      })
    );

    const responseData = {
      issues: issuesWithDetails,
      totalCount: response.data.total_count,
      currentPage: parseInt(page),
      hasMore: response.data.total_count > page * perPage
    };

    // Cache for 1 minute
    cache.put(cacheKey, responseData, 60 * 1000);

    res.json(responseData);
  } catch (error) {
    console.error('Error fetching issues:', error.response?.data);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.message || 'Failed to fetch issues'
    });
  }
};

exports.getAssignedIssues = async (req, res) => {
  try {
    const { state } = req.query;
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

    const transformedIssues = data.items.map((item) => ({
      id: item.id,
      number: item.number,
      title: item.title,
      body: item.body,
      state: item.state,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      commentsCount: item.comments,
      labels: item.labels.map((label) => ({
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