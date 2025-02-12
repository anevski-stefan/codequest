const express = require('express');
const router = express.Router();
const { getActivity } = require('../controllers/activityController');
const etagMiddleware = require('../middleware/etagMiddleware');

router.get('/', etagMiddleware, getActivity);

module.exports = router; 