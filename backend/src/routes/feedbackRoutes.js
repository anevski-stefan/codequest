const express = require('express');
const router = express.Router();
const {
  submit
} = require('../controllers/feedbackController');
router.post('/', express.json({ limit: '1mb' }), submit);
module.exports = router;