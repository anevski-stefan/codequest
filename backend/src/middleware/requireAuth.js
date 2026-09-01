const GitHubService = require('../services/githubService');

const TOKEN_VALIDITY_WINDOW_MS = 60 * 1000;

const requireAuth = (req, res, next) => {
  if (!req.user || !req.user.accessToken) {
    return res.status(401).json({
      error: 'Unauthorized'
    });
  }
  const now = Date.now();
  const lastCheck = req.session?.lastTokenCheck;
  if (lastCheck && now - lastCheck < TOKEN_VALIDITY_WINDOW_MS) {
    return next();
  }
  GitHubService.validateToken(req.user.accessToken)
    .then(valid => {
      if (!valid) {
        if (req.session) {
          delete req.session.lastTokenCheck;
          delete req.session.passport;
        }
        return res.status(401).json({
          error: 'Unauthorized'
        });
      }
      if (req.session) {
        req.session.lastTokenCheck = now;
      }
      next();
    })
    .catch((error) => {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Token validation error:', error.message);
      }
      return res.status(503).json({
        error: 'Unable to verify authentication token'
      });
    });
};
module.exports = requireAuth;
