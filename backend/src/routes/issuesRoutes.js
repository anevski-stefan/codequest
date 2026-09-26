const express = require('express');
const router = express.Router();
const {
  getAssignedIssues
} = require('../controllers/issuesController');
const {
  getIssueComments
} = require('../controllers/commentsController');
const { explainIssue } = require('../controllers/issueExplainController');
const { getSuggestedIssues } = require('../controllers/suggestedIssuesController');
const { getIssueClaims } = require('../controllers/claimsController');
const requireAuth = require('../middleware/requireAuth');
const { aiChatLimiter } = require('../middleware/rateLimiter');
router.use(requireAuth);
router.get('/suggested', getSuggestedIssues);
router.get('/assigned', getAssignedIssues);
router.post('/claims', getIssueClaims);
router.get('/:issueNumber/comments', getIssueComments);
router.post('/explain/:owner/:repo', aiChatLimiter, explainIssue);
module.exports = router;