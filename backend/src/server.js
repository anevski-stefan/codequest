const express = require('express');
const session = require('express-session');
const cors = require('cors');
require('dotenv').config();
const passport = require('passport');
require('./config/passport');
const etagMiddleware = require('./middleware/etagMiddleware');
const chatRoutes = require('./routes/chatRoutes');
const hackathonRoutes = require('./routes/hackathonRoutes');
const authRoutes = require('./routes/authRoutes');
const issuesRoutes = require('./routes/issuesRoutes');
const reposRoutes = require('./routes/reposRoutes');
const activityRoutes = require('./routes/activityRoutes');
const codeBuddyRoutes = require('./routes/codeBuddyRoutes');
const githubProxyRoutes = require('./routes/githubProxyRoutes');
const requireAuth = require('./middleware/requireAuth');
const limiter = require('./middleware/rateLimiter');
const newsletterRoutes = require('./routes/newsletterRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const HackathonService = require('./services/hackathonService');
const app = express();
const hackathonService = new HackathonService();
app.set('hackathonService', hackathonService);
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(etagMiddleware);
app.use(express.json());
app.use(limiter);
app.use('/api/activity', requireAuth, activityRoutes);
app.use('/api/issues', requireAuth, issuesRoutes);
app.use('/api/repos', requireAuth, reposRoutes);
app.use('/api/code-buddy', requireAuth, codeBuddyRoutes);
app.use('/api/chats', requireAuth, chatRoutes);
app.use('/api/github', githubProxyRoutes);
app.use('/auth', authRoutes);
app.use('/api/hackathons', hackathonRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/feedback', feedbackRoutes);
app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
});