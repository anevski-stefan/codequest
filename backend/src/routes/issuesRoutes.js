const express = require('express');
const router = express.Router();
const {
  getAssignedIssues
} = require('../controllers/issuesController');
const {
  getIssueComments
} = require('../controllers/commentsController');
const requireAuth = require('../middleware/requireAuth');
router.use(requireAuth);
router.get('/assigned', getAssignedIssues);
router.get('/:issueNumber/comments', getIssueComments);
module.exports = router;