const express = require('express');
const router = express.Router();
const {
  getIssues,
  getAssignedIssues
} = require('../controllers/issuesController');
const etagMiddleware = require('../middleware/etagMiddleware');
router.get('/', etagMiddleware, getIssues);
router.get('/assigned', etagMiddleware, getAssignedIssues);
module.exports = router;