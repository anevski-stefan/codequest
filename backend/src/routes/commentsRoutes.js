const express = require('express');
const router = express.Router();
const { getIssueComments } = require('../controllers/commentsController');
const etagMiddleware = require('../middleware/etagMiddleware');

router.get('/:issueNumber/comments', etagMiddleware, getIssueComments);

module.exports = router; 