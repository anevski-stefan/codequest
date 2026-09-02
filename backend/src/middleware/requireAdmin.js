const logger = require('../utils/logger');
const { sendError } = require('../utils/httpError');
const requireAdmin = (req, res, next) => {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  if (adminEmails.length === 0) {
    logger.warn('ADMIN_EMAILS is not set — admin-only routes will deny everyone');
    return sendError(res, 403, 'Forbidden: admin access not configured');
  }
  if (!req.user || !req.user.email) {
    return sendError(res, 401, 'Unauthorized');
  }
  if (!adminEmails.includes(req.user.email.toLowerCase())) {
    return sendError(res, 403, 'Forbidden: admin access required');
  }
  next();
};
module.exports = requireAdmin;
