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
router.get('/:owner/:repo', getRepoDetails);
router.get('/:owner/:repo/contributors/stats', getRepoContributors);
router.get('/:owner/:repo/lottery-contributors', getLotteryContributors);
router.get('/:owner/:repo/contributor-confidence', getContributorConfidence);
router.get('/:owner/:repo/pulls', getPulls);
router.get('/:owner/:repo/pulls/:pullNumber', getPullDetails);
router.post('/:owner/:repo/issues/:number/comments', createComment);
module.exports = router;