const express = require('express');
const router = express.Router();
const { 
  createComment, 
  getRepoDetails, 
  getRepoContributors,
  getLotteryContributors,
  getContributorConfidence,
  getPulls,
  getPullDetails
} = require('../controllers/reposController');
const etagMiddleware = require('../middleware/etagMiddleware');

// Get repository details
router.get('/:owner/:repo', etagMiddleware, getRepoDetails);

// Get repository contributors
router.get('/:owner/:repo/contributors/stats', etagMiddleware, getRepoContributors);

// Get lottery contributors
router.get('/:owner/:repo/lottery-contributors', etagMiddleware, getLotteryContributors);

// Get contributor confidence
router.get('/:owner/:repo/contributor-confidence', etagMiddleware, getContributorConfidence);

// Get repository pull requests
router.get('/:owner/:repo/pulls', etagMiddleware, getPulls);

// Get pull request details
router.get('/:owner/:repo/pulls/:pullNumber', etagMiddleware, getPullDetails);

// POST endpoint for creating comments
router.post('/:owner/:repo/issues/:number/comments', express.json(), createComment);

module.exports = router; 