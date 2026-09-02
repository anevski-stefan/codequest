const express = require('express');
const router = express.Router();
const {
  submit
} = require('../controllers/feedbackController');
router.post('/', submit);
module.exports = router;