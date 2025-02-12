const express = require('express');
const session = require('express-session');
const cors = require('cors');
require('dotenv').config();

// Import passport after session
const passport = require('passport');
// Import the configured passport instance
require('./config/passport');

const axios = require('axios');
const rateLimit = require('express-rate-limit');
const etagMiddleware = require('./middleware/etagMiddleware');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const { CodeBuddyService } = require('./services/codeBuddyService.js');
const GitHubService = require('./services/githubService');
const supabaseService = require('./services/supabaseService');
const chatRoutes = require('./routes/chatRoutes');
const hackathonRoutes = require('./routes/hackathonRoutes');
const authRoutes = require('./routes/authRoutes');
const issuesRoutes = require('./routes/issuesRoutes');
const reposRoutes = require('./routes/reposRoutes');
const activityRoutes = require('./routes/activityRoutes');
const commentsRoutes = require('./routes/commentsRoutes');
const codeBuddyRoutes = require('./routes/codeBuddyRoutes');
const authenticateToken = require('./middleware/authenticateToken');
const limiter = require('./middleware/rateLimiter');
const newsletterRoutes = require('./routes/newsletterRoutes');

const app = express();

app.use(cors({
  origin: 'http://localhost:5173', 
  credentials: true
}));

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

app.use(passport.initialize());
app.use(passport.session());

app.use(etagMiddleware);

app.use(express.json());

app.use(limiter);

app.use('/api/activity', authenticateToken, activityRoutes);

app.use('/api/issues', authenticateToken, issuesRoutes);

app.use('/api/issues', authenticateToken, commentsRoutes);

app.use('/api/repos', authenticateToken, reposRoutes);

app.use('/api/code-buddy', authenticateToken, codeBuddyRoutes);

app.use('/api/chats', authenticateToken, chatRoutes);

app.use('/auth', authRoutes);
app.use('/api/hackathons', hackathonRoutes);

app.use('/api/newsletter', newsletterRoutes);

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
});