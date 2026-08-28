const express = require('express');
const router = express.Router();
const {
  submit
} = require('../controllers/feedbackController');
router.post('/', express.json(), submit);
module.exports = router;