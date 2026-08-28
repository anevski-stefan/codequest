const express = require('express');
const router = express.Router();
const {
  getAssignedIssues
} = require('../controllers/issuesController');
const etagMiddleware = require('../middleware/etagMiddleware');
router.get('/assigned', etagMiddleware, getAssignedIssues);
module.exports = router;