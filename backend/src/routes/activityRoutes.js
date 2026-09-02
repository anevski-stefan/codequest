const express = require('express');
const router = express.Router();
const {
  getActivity
} = require('../controllers/activityController');
router.get('/', getActivity);
module.exports = router;