const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // Store token in request for use in routes
  req.user = { accessToken: token };
  next();
};

module.exports = authenticateToken; 