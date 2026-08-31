const express = require('express');
const crypto = require('crypto');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();
const passport = require('passport');
require('./config/passport');
const etagMiddleware = require('./middleware/etagMiddleware');
const requestLogger = require('./middleware/requestLogger');
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
const aiKeysRoutes = require('./routes/aiKeysRoutes');
const app = express();

const trustProxy = process.env.TRUST_PROXY;
if (trustProxy === undefined) {
  app.set('trust proxy', 0);
} else if (trustProxy === 'true') {
  app.set('trust proxy', true);
} else if (trustProxy === 'false') {
  app.set('trust proxy', false);
} else {
  const hops = Number(trustProxy);
  app.set('trust proxy', Number.isInteger(hops) && hops > 0 ? hops : true);
}

const envSessionSecret = process.env.SESSION_SECRET;
let sessionSecret = envSessionSecret;
if (!sessionSecret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET environment variable is required in production');
  }
  sessionSecret = crypto.randomBytes(32).toString('hex');
  console.warn('[server] SESSION_SECRET not set; using a random ephemeral session secret. Sessions will not survive a restart. Set SESSION_SECRET for persistence.');
}

if (!process.env.AI_KEY_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('AI_KEY_SECRET environment variable is required in production');
}

const corsOrigin = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : (process.env.CLIENT_URL || 'http://localhost:5173');

app.use(helmet());
app.use(compression());
app.use(requestLogger);
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));
app.use(session({
  secret: sessionSecret,
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
app.use(express.json({
  limit: '1mb'
}));
app.use(express.urlencoded({
  extended: true,
  limit: '1mb'
}));
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});
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
app.use('/api/ai-keys', requireAuth, aiKeysRoutes);
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found'
  });
});
app.use((err, req, res, next) => {
  console.error('[server] Unhandled error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV !== 'production' ? err.message : 'Internal server error'
  });
});

const server = app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
});

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[server] ${signal} received, shutting down gracefully...`);
  try {
    new (require('./services/hackathonService'))().shutdown();
  } catch (error) {
    console.warn('[server] Could not stop hackathon scheduler:', error.message);
  }
  const forceTimer = setTimeout(() => {
    console.error('[server] Forcefully exiting after shutdown timeout');
    process.exit(1);
  }, 10000);
  forceTimer.unref();
  server.close(err => {
    if (err) {
      console.error('[server] Error closing server:', err);
      process.exit(1);
    }
    console.log('[server] HTTP server closed');
    clearTimeout(forceTimer);
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));