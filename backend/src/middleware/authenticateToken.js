const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // For GET requests, get userId from params
    if (req.method === 'GET' && req.params.userId) {
      req.user = {
        id: req.params.userId,
        accessToken: token
      };
    } 
    // For POST requests, get userId from body
    else if (req.method === 'POST' && req.body.userId) {
      req.user = {
        id: req.body.userId,
        accessToken: token
      };
    }
    // For DELETE requests, get userId from query params or headers
    else if (req.method === 'DELETE') {
      const userId = req.query.userId || req.headers['user-id'];
      req.user = {
        id: userId,
        accessToken: token
      };
    }
    // For other requests or when userId is not provided
    else {
      req.user = {
        accessToken: token
      };
    }

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

module.exports = authenticateToken; 