const express = require('express');
const router = express.Router();
const { getIssues, getAssignedIssues } = require('../controllers/issuesController');
const etagMiddleware = require('../middleware/etagMiddleware');

// Get all issues
router.get('/', etagMiddleware, getIssues);

// Get assigned issues
router.get('/assigned', etagMiddleware, getAssignedIssues);

module.exports = router;