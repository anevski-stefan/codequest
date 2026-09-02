const GitHubService = require('../services/githubService');
const { sendError } = require('../utils/httpError');

const TOKEN_VALIDITY_WINDOW_MS = 60 * 1000;

const requireAuth = (req, res, next) => {
  if (!req.user || !req.user.accessToken) {
    return sendError(res, 401, 'Unauthorized');
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
        return sendError(res, 401, 'Unauthorized');
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
      return sendError(res, 503, 'Unable to verify authentication token');
    });
};
module.exports = requireAuth;
