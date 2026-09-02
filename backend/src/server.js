const express = require('express');
const logger = require('./utils/logger');
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
const csrfGuard = require('./middleware/csrfGuard');
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
const {
  newsletterLimiter,
  feedbackLimiter,
  aiChatLimiter,
  aiKeysLimiter
} = limiter;
const newsletterRoutes = require('./routes/newsletterRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const aiKeysRoutes = require('./routes/aiKeysRoutes');
const SupabaseSessionStore = require('./utils/supabaseSessionStore');
const app = express();

const trustProxy = process.env.TRUST_PROXY;
if (trustProxy === undefined || trustProxy === '' || trustProxy === 'false' || trustProxy === '0') {
  app.set('trust proxy', false);
} else if (trustProxy === 'true') {
  app.set('trust proxy', true);
} else {
  const hops = Number(trustProxy);
  if (Number.isInteger(hops) && hops > 0) {
    app.set('trust proxy', hops);
  } else {
    logger.warn(`[server] Invalid TRUST_PROXY value "${trustProxy}"; defaulting to no proxy trust.`);
    app.set('trust proxy', false);
  }
}

const envSessionSecret = process.env.SESSION_SECRET;
let sessionSecret = envSessionSecret;
if (!sessionSecret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET environment variable is required in production');
  }
  sessionSecret = crypto.randomBytes(32).toString('hex');
  logger.warn('[server] SESSION_SECRET not set; using a random ephemeral session secret. Sessions will not survive a restart. Set SESSION_SECRET for persistence.');
}

if (!process.env.AI_KEY_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('AI_KEY_SECRET environment variable is required in production');
}

if (!process.env.GITHUB_CALLBACK_URL && process.env.NODE_ENV === 'production') {
  throw new Error('GITHUB_CALLBACK_URL environment variable is required in production');
}

const envSessionMaxAge = Number(process.env.SESSION_MAX_AGE_MS);
const sessionMaxAgeMs = Number.isInteger(envSessionMaxAge) && envSessionMaxAge > 0
  ? envSessionMaxAge
  : 24 * 60 * 60 * 1000;

const requestedSessionStore = (process.env.SESSION_STORE || 'memory').toLowerCase();
let sessionStore;
if (requestedSessionStore === 'supabase') {
  sessionStore = new SupabaseSessionStore();
} else {
  if (process.env.NODE_ENV === 'production') {
    logger.warn('[server] SESSION_STORE not set to "supabase"; using in-memory sessions. Set SESSION_STORE=supabase for restart-safe, multi-instance sessions.');
  }
  sessionStore = new session.MemoryStore();
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
  store: sessionStore,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: sessionMaxAgeMs
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
app.use(csrfGuard);
app.use('/api/activity', requireAuth, activityRoutes);
app.use('/api/issues', requireAuth, issuesRoutes);
app.use('/api/repos', requireAuth, reposRoutes);
app.use('/api/code-buddy', requireAuth, aiChatLimiter, codeBuddyRoutes);
app.use('/api/chats', requireAuth, aiChatLimiter, chatRoutes);
app.use('/api/github', githubProxyRoutes);
app.use('/auth', authRoutes);
app.use('/api/hackathons', hackathonRoutes);
app.use('/api/newsletter', newsletterLimiter, newsletterRoutes);
app.use('/api/feedback', feedbackLimiter, feedbackRoutes);
app.use('/api/ai-keys', requireAuth, aiKeysLimiter, aiKeysRoutes);
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found'
  });
});
app.use((err, req, res, next) => {
  logger.error('[server] Unhandled error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV !== 'production' ? err.message : 'Internal server error'
  });
});

const server = app.listen(process.env.PORT || 3000, () => {
  logger.info(`Server is running on port ${process.env.PORT || 3000}`);
});

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`[server] ${signal} received, shutting down gracefully...`);
  try {
    new (require('./services/hackathonService'))().shutdown();
  } catch (error) {
    logger.warn('[server] Could not stop hackathon scheduler:', error.message);
  }
  const forceTimer = setTimeout(() => {
    logger.error('[server] Forcefully exiting after shutdown timeout');
    process.exit(1);
  }, 10000);
  forceTimer.unref();
  server.close(err => {
    if (err) {
      logger.error('[server] Error closing server:', err);
      process.exit(1);
    }
    logger.info('[server] HTTP server closed');
    clearTimeout(forceTimer);
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));