const requireAuth = (req, res, next) => {
  if (!req.user || !req.user.accessToken) {
    return res.status(401).json({
      error: 'Unauthorized'
    });
  }
  next();
};
module.exports = requireAuth;