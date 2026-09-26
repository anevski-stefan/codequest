const express = require('express');
const router = express.Router();
const {
  createComment,
  getRepoDetails,
  getRepoContributors,
  getLotteryContributors,
  getMergeLikelihood,
  getPulls,
  getPullDetails,
  checkRepoStarred,
  starRepo,
  unstarRepo,
} = require('../controllers/reposController');
const { onboardRepo } = require('../controllers/repoOnboardingController');
const { aiChatLimiter } = require('../middleware/rateLimiter');
const requireAuth = require('../middleware/requireAuth');
const { validateOwnerRepo } = require('../utils/validateParams');
router.use(requireAuth);
router.use('/:owner/:repo', validateOwnerRepo);
router.get('/:owner/:repo', getRepoDetails);
router.get('/:owner/:repo/contributors/stats', getRepoContributors);
router.get('/:owner/:repo/lottery-contributors', getLotteryContributors);
router.get('/:owner/:repo/merge-likelihood', getMergeLikelihood);
router.get('/:owner/:repo/pulls', getPulls);
router.get('/:owner/:repo/pulls/:pullNumber', getPullDetails);
router.post('/:owner/:repo/issues/:number/comments', createComment);
router.post('/:owner/:repo/onboard', aiChatLimiter, onboardRepo);
router.get('/:owner/:repo/starred', checkRepoStarred);
router.put('/:owner/:repo/starred', starRepo);
router.delete('/:owner/:repo/starred', unstarRepo);
module.exports = router;