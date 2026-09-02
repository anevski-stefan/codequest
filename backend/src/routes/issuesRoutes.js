const express = require('express');
const router = express.Router();
const {
  getAssignedIssues
} = require('../controllers/issuesController');
const {
  getIssueComments
} = require('../controllers/commentsController');
router.get('/assigned', getAssignedIssues);
router.get('/:issueNumber/comments', getIssueComments);
module.exports = router;