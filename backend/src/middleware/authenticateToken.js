const axios = require('axios');
const verificationCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized: missing or malformed Authorization header'
      });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized: missing token'
      });
    }
    const cached = verificationCache.get(token);
    if (cached && cached.expires > Date.now()) {
      req.user = {
        ...cached.user,
        accessToken: token
      };
      return next();
    }
    const {
      data: githubUser
    } = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'CodeQuest'
      }
    });
    const user = {
      id: githubUser.id,
      login: githubUser.login
    };
    verificationCache.set(token, {
      user,
      expires: Date.now() + CACHE_TTL_MS
    });
    req.user = {
      ...user,
      accessToken: token
    };
    next();
  } catch (error) {
    if (error.response?.status === 401) {
      return res.status(401).json({
        error: 'Unauthorized: invalid or expired token'
      });
    }
    console.error('Authentication error:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Authentication failed'
    });
  }
};
module.exports = authenticateToken;