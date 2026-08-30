const rateLimit = require('express-rate-limit');
const errorHandler = (req, res) => {
  res.status(429).json({
    error: 'Too many requests',
    message: 'Please try again later',
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
module.exports = limiter;
module.exports.authLimiter = authLimiter;