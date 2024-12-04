const express = require('express');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const session = require('express-session');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const rateLimit = require('express-rate-limit');
const cache = require('memory-cache');
const etag = require('etag');

const app = express();

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// CORS configuration
app.use(cors({
  origin: 'http://localhost:5173', // Your frontend URL
  credentials: true
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Passport GitHub strategy configuration
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/github/callback",
    scope: ['repo', 'read:user', 'user:email'],
    proxy: true
  },
  async function(accessToken, refreshToken, profile, done) {
    try {
      // Store both profile and token
      const user = {
        id: profile.id,
        username: profile.username,
        accessToken: accessToken,
        avatar_url: profile._json.avatar_url,
        email: profile.emails?.[0]?.value
      };
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
));

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from the session
passport.deserializeUser((user, done) => {
  done(null, user);
});

// Auth routes
app.get('/auth/github',
  passport.authenticate('github', { scope: ['repo', 'read:user', 'user:email'] })
);

app.get('/auth/github/callback', 
  passport.authenticate('github', { 
    failureRedirect: 'http://localhost:5173/login',
    session: true
  }),
  function(req, res) {
    // Successful authentication
    const token = req.user.accessToken;
    res.redirect(`http://localhost:5173/auth/callback?token=${token}`);
  }
);

// Middleware to check authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // Store token in request for use in routes
  req.user = { accessToken: token };
  next();
};

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);

// Cache middleware
const cacheMiddleware = (duration) => {
  return (req, res, next) => {
    const key = `__express__${req.originalUrl || req.url}`;
    const cachedBody = cache.get(key);

    if (cachedBody) {
      res.send(cachedBody);
      return;
    }

    res.sendResponse = res.send;
    res.send = (body) => {
      cache.put(key, body, duration * 1000);
      res.sendResponse(body);
    };
    next();
  };
};

// ETag middleware
const etagMiddleware = (req, res, next) => {
  // Store the original send
  const originalSend = res.send;

  // Override res.send
  res.send = function (body) {
    // Only generate ETag if there's a body
    if (body) {
      // Generate ETag
      const generatedEtag = etag(JSON.stringify(body));
      
      // Check if client sent If-None-Match header
      const clientEtag = req.headers['if-none-match'];
      
      if (clientEtag && clientEtag === generatedEtag) {
        // Return 304 if ETags match
        res.status(304).send();
        return;
      }

      // Set ETag header
      res.setHeader('ETag', generatedEtag);
    }
    
    // Call original send
    return originalSend.call(this, body);
  };

  next();
};

// Apply the middleware globally (optional)
app.use(etagMiddleware);

// Add activity endpoint
app.get('/api/activity', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get('https://api.github.com/users/me/events', {
      headers: {
        Authorization: `token ${req.user.accessToken}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });
    
    const activities = response.data.map(event => ({
      id: event.id,
      type: event.type,
      repo: event.repo.name,
      date: event.created_at,
      payload: event.payload
    }));

    res.json(activities);
  } catch (error) {
    console.error('Error fetching activity:', error.response?.data);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// Add issues endpoint with detailed status
app.get('/api/issues', authenticateToken, etagMiddleware, async (req, res) => {
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
          state: status, // Using the detailed status
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
});

// Add after the existing /api/issues endpoint
app.get('/api/issues/assigned', authenticateToken, etagMiddleware, async (req, res) => {
  try {
    // Add 'is:issue' to the search query to exclude pull requests
    const searchQuery = 'is:issue assignee:@me';

    const response = await axios.get('https://api.github.com/search/issues', {
      headers: {
        Authorization: `token ${req.user.accessToken}`,
        Accept: 'application/vnd.github.v3+json'
      },
      params: {
        q: searchQuery,
        sort: 'updated',
        order: 'desc',
        per_page: 100 // Increase the number of results
      }
    });

    const issuesWithDetails = response.data.items.map(item => ({
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
      repository: {
        id: item.repository_url.split('/').pop(),
        fullName: item.repository_url.split('/').slice(-2).join('/'),
        url: item.html_url
      },
      user: {
        login: item.user.login,
        avatarUrl: item.user.avatar_url
      },
      url: item.html_url
    }));

    res.json({
      issues: issuesWithDetails,
      totalCount: response.data.total_count,
      hasMore: false,
      currentPage: 1
    });
  } catch (error) {
    console.error('Error fetching assigned issues:', error.response?.data);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.message || 'Failed to fetch assigned issues'
    });
  }
});

// Keep both endpoints for now until we debug the issue
app.get('/api/issues/:issueNumber/comments', authenticateToken, etagMiddleware, async (req, res) => {
  try {
    const { issueNumber } = req.params;
    const { owner, repo } = req.query;

    if (!owner || !repo) {
      return res.status(400).json({ error: 'Owner and repo are required' });
    }

    console.log('Fetching comments:', { owner, repo, issueNumber });

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

    console.log('Returning comments:', { count: comments.length });

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
});

// Keep the POST endpoint as is
app.post('/api/repos/:owner/:repo/issues/:number/comments', authenticateToken, express.json(), async (req, res) => {
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
});

// Add assigned issues endpoint with better error handling
app.get('/api/assigned-issues', authenticateToken, async (req, res) => {
  try {
    const { state } = req.query; // Get the state from query parameters
    const queryState = state === 'closed' ? 'is:closed' : 'is:open'; // Default to open if not specified

    const response = await axios.get('https://api.github.com/search/issues', {
      headers: {
        'Authorization': `Bearer ${req.user.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      params: {
        q: `is:issue ${queryState} assignee:@me`, // Use the state in the query
        per_page: 30,
        sort: 'updated',
        order: 'desc'
      }
    });

    if (!response.data) {
      throw new Error('No data received from GitHub API');
    }

    const transformedIssues = response.data.items.map((item) => ({
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

    const responseData = {
      issues: transformedIssues,
      totalCount: response.data.total_count,
      hasMore: transformedIssues.length === 30,
      currentPage: 1
    };

    res.json(responseData);
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
});

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  if (err instanceof Error) {
    return res.status(500).json({
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
  next(err);
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
});