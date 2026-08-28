const express = require('express');
const router = express.Router();
const {
  githubAuth,
  githubCallback,
  getMe,
  logout
} = require('../controllers/authController');
router.get('/github', githubAuth);
router.get('/github/callback', ...githubCallback);
router.get('/me', getMe);
router.get('/logout', logout);
module.exports = router;