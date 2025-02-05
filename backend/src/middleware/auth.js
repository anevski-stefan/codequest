const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      error: 'No token provided'
    });
  }
  try {
    const userId = req.method === 'GET' ? req.params.userId : req.body.userId;
    req.user = {
      id: userId,
      accessToken: token
    };
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({
      error: 'Invalid token'
    });
  }
};
module.exports = {
  authenticateToken
};