const express = require('express');
const router = express.Router();
const {
  getAssignedIssues
} = require('../controllers/issuesController');
const {
  getIssueComments
} = require('../controllers/commentsController');
const etagMiddleware = require('../middleware/etagMiddleware');
router.get('/assigned', etagMiddleware, getAssignedIssues);
router.get('/:issueNumber/comments', etagMiddleware, getIssueComments);
module.exports = router;