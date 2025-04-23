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
router.get('/:owner/:repo', etagMiddleware, getRepoDetails);
router.get('/:owner/:repo/contributors/stats', etagMiddleware, getRepoContributors);
router.get('/:owner/:repo/lottery-contributors', etagMiddleware, getLotteryContributors);
router.get('/:owner/:repo/contributor-confidence', etagMiddleware, getContributorConfidence);
router.get('/:owner/:repo/pulls', etagMiddleware, getPulls);
router.get('/:owner/:repo/pulls/:pullNumber', etagMiddleware, getPullDetails);
router.post('/:owner/:repo/issues/:number/comments', express.json(), createComment);
module.exports = router;