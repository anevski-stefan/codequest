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
  skip: (req) => {
    return req.path.startsWith('/auth') || req.path === '/health';
  },
  keyGenerator: (req) => {
    return req.user ? `${req.ip}-${req.user.id}` : req.ip;
  }
});

module.exports = limiter; 