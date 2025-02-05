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
const cron = require('node-cron');
const HackathonCrawler = require('./services/hackathonCrawler');
const crawler = new HackathonCrawler();
const nodemailer = require('nodemailer');
const { CodeBuddyService } = require('./services/codeBuddyService.js');
const GitHubService = require('./services/githubService');

// Add after line 12
let isInitialCrawlComplete = false;

// Initialize with the existing crawler instance
const initializeCrawler = async () => {
  try {
    console.log('Starting initial hackathon crawl...');
    await crawler.crawlAll();
    isInitialCrawlComplete = true;
    console.log('Initial crawl complete');
  } catch (error) {
    console.error('Error during initial crawl:', error);
    // Set to true anyway to prevent permanent loading state
    isInitialCrawlComplete = true;
  }
};

// Call initialization
initializeCrawler();

// Schedule crawler to run every 6 hours
cron.schedule('0 */6 * * *', async () => {
  try {
    await crawler.crawlAll();
  } catch (error) {
    console.error('Scheduled crawl failed:', error);
  }
});

// Session configuration
const app = express();
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
    scope: ['read:user', 'user:email'],
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
  passport.authenticate('github', { scope: ['read:user', 'user:email'] })
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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
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
    const { state } = req.query;
    const queryState = state === 'closed' ? 'is:closed' : 'is:open';
    const query = `is:issue ${queryState} assignee:@me`;
    
    const data = await GitHubService.searchIssues(req.user.accessToken, query, {
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

app.post('/api/newsletter/subscribe', express.json(), async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const response = await axios({
      method: 'post',
      url: `https://${process.env.MAILCHIMP_SERVER}.api.mailchimp.com/3.0/lists/${process.env.MAILCHIMP_LIST_ID}/members`,
      auth: {
        username: 'anystring',
        password: process.env.MAILCHIMP_API_KEY
      },
      data: {
        email_address: email,
        status: 'pending'
      }
    });

    res.status(200).json({
      message: 'Please check your email to confirm your subscription.'
    });
  } catch (error) {
    console.error('Mailchimp error:', {
      status: error.response?.status,
      data: error.response?.data,
      error: error.message
    });

    // Handle specific Mailchimp error cases
    if (error.response?.status === 400 && error.response?.data?.title === 'Member Exists') {
      return res.status(400).json({
        error: 'You are already subscribed to our newsletter.'
      });
    }

    if (error.response?.status === 400) {
      return res.status(400).json({
        error: error.response.data.detail || 'Invalid request'
      });
    }

    res.status(500).json({
      error: 'Failed to subscribe. Please try again later.'
    });
  }
});

// Add feedback endpoint
app.post('/api/feedback', express.json(), async (req, res) => {
  const { message } = req.body;
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'anevskistefan11@gmail.com',
      subject: 'New Code Quest Feedback',
      text: message
    });

    console.log('Feedback email sent successfully');
    res.status(200).json({ message: 'Feedback sent successfully' });
  } catch (error) {
    console.error('Error sending feedback email:', error);
    res.status(500).json({ error: 'Failed to send feedback' });
  }
});

// Modify the hackathons endpoint
app.get('/api/hackathons', limiter, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, source } = req.query;
    
    // If initial crawl isn't complete, return a specific status
    if (!isInitialCrawlComplete) {
      return res.status(202).json({
        status: 'initializing',
        message: 'Data is being loaded, please try again in a moment'
      });
    }

    let hackathons = crawler.getAllHackathons();
    
    console.log(`Fetching hackathons - Total available: ${hackathons?.length || 0}`);

    // Ensure hackathons is always an array
    if (!Array.isArray(hackathons)) {
      console.log('No hackathons available, returning empty array');
      hackathons = [];
    }

    if (search) {
      const searchLower = search.toLowerCase();
      hackathons = hackathons.filter(h => 
        h.title.toLowerCase().includes(searchLower) ||
        h.description.toLowerCase().includes(searchLower)
      );
    }

    if (source) {
      hackathons = hackathons.filter(h => h.source === source);
    }

    // Sort by start date
    hackathons.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    // Manual pagination
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginatedHackathons = hackathons.slice(start, start + parseInt(limit));

    console.log(`Returning ${paginatedHackathons.length} hackathons for page ${page}`);

    return res.json({
      hackathons: paginatedHackathons,
      totalPages: Math.ceil(hackathons.length / parseInt(limit)),
      currentPage: parseInt(page),
      totalHackathons: hackathons.length
    });
  } catch (error) {
    console.error('Error in /api/hackathons:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch hackathons',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Add repository details endpoint
app.get('/api/repos/:owner/:repo', authenticateToken, async (req, res) => {
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
});

// Add repository contributors endpoint
app.get('/api/repos/:owner/:repo/contributors/stats', authenticateToken, async (req, res) => {
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
});

// Add repository pull requests endpoint
app.get('/api/repos/:owner/:repo/lottery-contributors', authenticateToken, async (req, res) => {
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
});

// Add contributor confidence endpoint
app.get('/api/repos/:owner/:repo/contributor-confidence', authenticateToken, async (req, res) => {
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

    // Calculate metrics (same logic as before)
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
});

app.get('/api/repos/:owner/:repo/pulls', authenticateToken, async (req, res) => {
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
});

// Helper function to get closed pull requests count
async function getClosedPullRequestsCount(owner, repo, token) {
  try {
    const response = await axios.get(
      `https://api.github.com/search/issues?q=repo:${owner}/${repo}+type:pr+state:closed`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      }
    );
    return response.data.total_count;
  } catch (error) {
    console.error('Error getting closed PR count:', error);
    return 0;
  }
}

app.get('/api/repos/:owner/:repo/pulls/:pullNumber', authenticateToken, async (req, res) => {
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
});

const codeBuddyService = new CodeBuddyService();

app.post('/api/code-buddy/chat', authenticateToken, express.json(), async (req, res) => {
  try {
    const { message, context, messages, service, apiKey } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!service || !apiKey) {
      return res.status(400).json({ error: 'AI service and API key are required' });
    }

    try {
      const response = await codeBuddyService.getResponse(
        message,
        context,
        messages,
        req.user.accessToken,
        service,
        apiKey
      );

      res.json({
        message: response,
        timestamp: new Date()
      });
    } catch (serviceError) {
      console.error('Service error:', serviceError);
      res.status(500).json({ 
        error: 'AI service error',
        details: serviceError.message
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
});