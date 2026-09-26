const express = require('express');
const router = express.Router();
const {
  getActivity,
  trackOutcome
} = require('../controllers/activityController');
const requireAuth = require('../middleware/requireAuth');
const { trackLimiter } = require('../middleware/rateLimiter');
router.use(requireAuth);
router.get('/', getActivity);
router.post('/track', trackLimiter, trackOutcome);
module.exports = router;
