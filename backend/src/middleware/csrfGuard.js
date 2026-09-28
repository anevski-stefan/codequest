const { sendError } = require('../utils/httpError');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const TRUSTED_SITES = new Set(['same-origin', 'same-site', 'none']);

function isRequestAllowed(req, allowedOrigins) {
  if (SAFE_METHODS.has(req.method)) return true;
  const site = req.headers['sec-fetch-site'];
  if (!site || TRUSTED_SITES.has(site)) return true;
  return allowedOrigins.includes(req.headers.origin);
}

function createCsrfGuard(allowedOrigins) {
  return (req, res, next) => {
    if (!isRequestAllowed(req, allowedOrigins)) {
      return sendError(res, 403, 'Cross-site request blocked');
    }
    return next();
  };
}

module.exports = createCsrfGuard;
module.exports.isRequestAllowed = isRequestAllowed;
