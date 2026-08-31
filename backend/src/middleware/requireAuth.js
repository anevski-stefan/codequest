const GitHubService = require('../services/githubService');

const TOKEN_VALIDITY_WINDOW_MS = 10 * 60 * 1000;

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
    .catch(() => {
      next();
    });
};
module.exports = requireAuth;
