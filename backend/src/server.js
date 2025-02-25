const express = require('express');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const session = require('express-session');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const rateLimit = require('express-rate-limit');
const cache = require('memory-cache');

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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);

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
app.get('/api/issues', authenticateToken, async (req, res) => {
  try {
    const { language, sort, state, page } = req.query;
    const cacheKey = `issues-${language}-${sort}-${state}-${page}`;
    
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const perPage = 20;
    let q = `is:issue is:${state}`;
    if (language) {
      q += ` language:${language}`;
    }

    const response = await axios.get('https://api.github.com/search/issues', {
      headers: {
        Authorization: `token ${req.user.accessToken}`,
        Accept: 'application/vnd.github.v3+json'
      },
      params: {
        q,
        sort,
        order: 'desc',
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