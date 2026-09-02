const express = require('express');
const router = express.Router();
const {
  getActivity
} = require('../controllers/activityController');
const requireAuth = require('../middleware/requireAuth');
router.use(requireAuth);
router.get('/', getActivity);
module.exports = router;