const express = require('express');
const router = express.Router();
const {
  githubAuth,
  githubCallback
} = require('../controllers/authController');
router.get('/github', githubAuth);
router.get('/github/callback', ...githubCallback);
module.exports = router;