const express = require('express');
const router = express.Router();
const { chat } = require('../controllers/codeBuddyController');

router.post('/chat', express.json(), chat);

module.exports = router; 