const csrfGuard = (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none') {
    return res.status(403).json({
      error: 'Cross-site request blocked'
    });
  }
  return next();
};
module.exports = csrfGuard;