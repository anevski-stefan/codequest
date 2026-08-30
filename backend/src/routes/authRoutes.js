const express = require('express');
const router = express.Router();
const {
  githubAuth,
  githubCallback,
  getMe,
  logout
} = require('../controllers/authController');
const requireAuth = require('../middleware/requireAuth');
router.get('/github', githubAuth);
router.get('/github/callback', ...githubCallback);
router.get('/me', requireAuth, getMe);
router.post('/logout', logout);
module.exports = router;