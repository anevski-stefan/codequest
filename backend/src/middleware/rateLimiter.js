const rateLimit = require('express-rate-limit');
const { errorBody, formatWait } = require('../utils/httpError');

const SIGNED_IN_MAX = 900;
const ANONYMOUS_MAX = 100;

function rateLimitMessage(retryAfterSeconds) {
  const seconds = parseInt(retryAfterSeconds, 10);
  const wait = Number.isFinite(seconds) && seconds > 0 ? `in ${formatWait(seconds)}` : 'shortly';
  return `Too many requests to Code Quest. Try again ${wait}.`;
}

const errorHandler = (req, res) => {
  const retryAfter = res.getHeader('Retry-After');
  res.status(429).json({
    ...errorBody(rateLimitMessage(retryAfter), undefined, 'RATE_LIMIT'),
    retryAfter
  });
};

const ipKeyGenerator = req => req.ip;
const userAwareKeyGenerator = req => {
  return req.user ? `${req.ip}-${req.user.id}` : req.ip;
};

const DEFAULTS = {
  windowMs: 15 * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: errorHandler
};

function makeLimiter({ max, windowMs = DEFAULTS.windowMs, keyGenerator = ipKeyGenerator, skip }) {
  return rateLimit({
    ...DEFAULTS,
    windowMs,
    max,
    keyGenerator,
    ...(skip ? { skip } : {})
  });
}

const globalMax = req => (req.user ? SIGNED_IN_MAX : ANONYMOUS_MAX);
const skipGlobal = req => req.path === '/health'
  || req.path.startsWith('/auth')
  || (!!req.user && req.path === '/api/activity/track');

const limiter = makeLimiter({
  max: globalMax,
  keyGenerator: userAwareKeyGenerator,
  skip: skipGlobal
});
const authLimiter = makeLimiter({ max: 30 });
const meLimiter = makeLimiter({ max: 120 });
const newsletterLimiter = makeLimiter({ max: 10 });
const feedbackLimiter = makeLimiter({ max: 20 });
const aiChatLimiter = makeLimiter({ max: 40, keyGenerator: userAwareKeyGenerator });
const aiKeysLimiter = makeLimiter({ max: 30, keyGenerator: userAwareKeyGenerator });
const trackLimiter = makeLimiter({ max: 300, keyGenerator: userAwareKeyGenerator });
const prTrackerLimiter = makeLimiter({ max: 60, keyGenerator: userAwareKeyGenerator });

module.exports = limiter;
module.exports.authLimiter = authLimiter;
module.exports.meLimiter = meLimiter;
module.exports.newsletterLimiter = newsletterLimiter;
module.exports.feedbackLimiter = feedbackLimiter;
module.exports.aiChatLimiter = aiChatLimiter;
module.exports.aiKeysLimiter = aiKeysLimiter;
module.exports.trackLimiter = trackLimiter;
module.exports.prTrackerLimiter = prTrackerLimiter;
module.exports.globalMax = globalMax;
module.exports.rateLimitMessage = rateLimitMessage;
