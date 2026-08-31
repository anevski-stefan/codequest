const express = require('express');
const router = express.Router();
const {
  githubAuth,
  githubCallback,
  getMe,
  logout
} = require('../controllers/authController');
const requireAuth = require('../middleware/requireAuth');
const {
  authLimiter
} = require('../middleware/rateLimiter');
router.get('/github', authLimiter, githubAuth);
router.get('/github/callback', authLimiter, ...githubCallback);
router.get('/me', requireAuth, getMe);
router.post('/logout', logout);
module.exports = router;