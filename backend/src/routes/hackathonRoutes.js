const express = require('express');
const router = express.Router();
const { getHackathons } = require('../controllers/hackathonController');
const { limiter } = require('../middleware/rateLimiter');

router.get('/', limiter, getHackathons);

module.exports = router;