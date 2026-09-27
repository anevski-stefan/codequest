const express = require('express');
const router = express.Router();
const { syncPrTracker } = require('../controllers/prTrackerController');
const requireAuth = require('../middleware/requireAuth');

router.use(requireAuth);

router.post('/sync', syncPrTracker);

module.exports = router;
