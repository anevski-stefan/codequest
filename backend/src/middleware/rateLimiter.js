const rateLimit = require('express-rate-limit');
const errorHandler = (req, res) => {
  res.status(429).json({
    error: 'Too many requests',
    details: 'Please try again later',
    retryAfter: res.getHeader('Retry-After')
  });
};
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: errorHandler,
  skip: req => {
    return req.path === '/health' || req.path.startsWith('/auth');
  },
  keyGenerator: req => {
    return req.user ? `${req.ip}-${req.user.id}` : req.ip;
  }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: errorHandler,
  keyGenerator: req => req.ip
});
const userAwareKeyGenerator = req => {
  return req.user ? `${req.ip}-${req.user.id}` : req.ip;
};
const newsletterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: errorHandler,
  keyGenerator: req => req.ip
});
const feedbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: errorHandler,
  keyGenerator: req => req.ip
});
const aiChatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  handler: errorHandler,
  keyGenerator: userAwareKeyGenerator
});
const aiKeysLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: errorHandler,
  keyGenerator: userAwareKeyGenerator
});
module.exports = limiter;
module.exports.authLimiter = authLimiter;
module.exports.newsletterLimiter = newsletterLimiter;
module.exports.feedbackLimiter = feedbackLimiter;
module.exports.aiChatLimiter = aiChatLimiter;
module.exports.aiKeysLimiter = aiKeysLimiter;