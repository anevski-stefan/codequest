const rateLimit = require('express-rate-limit');
const { errorBody } = require('../utils/httpError');

const errorHandler = (req, res) => {
  res.status(429).json({
    ...errorBody('Too many requests', 'Please try again later'),
    retryAfter: res.getHeader('Retry-After')
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

const limiter = makeLimiter({
  max: 100,
  keyGenerator: userAwareKeyGenerator,
  skip: req => {
    return req.path === '/health' || req.path.startsWith('/auth');
  }
});
const authLimiter = makeLimiter({ max: 30 });
const meLimiter = makeLimiter({ max: 120 });
const newsletterLimiter = makeLimiter({ max: 10 });
const feedbackLimiter = makeLimiter({ max: 20 });
const aiChatLimiter = makeLimiter({ max: 40, keyGenerator: userAwareKeyGenerator });
const aiKeysLimiter = makeLimiter({ max: 30, keyGenerator: userAwareKeyGenerator });

module.exports = limiter;
module.exports.authLimiter = authLimiter;
module.exports.meLimiter = meLimiter;
module.exports.newsletterLimiter = newsletterLimiter;
module.exports.feedbackLimiter = feedbackLimiter;
module.exports.aiChatLimiter = aiChatLimiter;
module.exports.aiKeysLimiter = aiKeysLimiter;