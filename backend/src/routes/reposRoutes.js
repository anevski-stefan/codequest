const express = require('express');
const router = express.Router();
const {
  createComment,
  getRepoDetails,
  getRepoContributors,
  getLotteryContributors,
  getMergeLikelihood,
  getMergeLikelihoodBulk,
  getPulls,
  getPullDetails,
  getIssueDetails,
  checkRepoStarred,
  starRepo,
  unstarRepo,
} = require('../controllers/reposController');
const { onboardRepo } = require('../controllers/repoOnboardingController');
const { aiChatLimiter } = require('../middleware/rateLimiter');
const { getFeedback, summarizeCi } = require('../controllers/prFeedbackController');
const requireAuth = require('../middleware/requireAuth');
const { validateOwnerRepo } = require('../utils/validateParams');
router.use(requireAuth);
router.post('/metrics/merge-likelihood-bulk', getMergeLikelihoodBulk);
router.use('/:owner/:repo', validateOwnerRepo);
router.get('/:owner/:repo', getRepoDetails);
router.get('/:owner/:repo/contributors/stats', getRepoContributors);
router.get('/:owner/:repo/lottery-contributors', getLotteryContributors);
router.get('/:owner/:repo/merge-likelihood', getMergeLikelihood);
router.get('/:owner/:repo/pulls', getPulls);
router.get('/:owner/:repo/pulls/:pullNumber', getPullDetails);
router.get('/:owner/:repo/pulls/:pullNumber/feedback', getFeedback);
router.post('/:owner/:repo/pulls/:pullNumber/ci-summary', aiChatLimiter, summarizeCi);
router.get('/:owner/:repo/issues/:number', getIssueDetails);
router.post('/:owner/:repo/issues/:number/comments', createComment);
router.post('/:owner/:repo/onboard', aiChatLimiter, onboardRepo);
router.get('/:owner/:repo/starred', checkRepoStarred);
router.put('/:owner/:repo/starred', starRepo);
router.delete('/:owner/:repo/starred', unstarRepo);
module.exports = router;