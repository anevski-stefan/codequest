const express = require('express');
const router = express.Router();
const {
  chat
} = require('../controllers/codeBuddyController');
const requireAuth = require('../middleware/requireAuth');
router.use(requireAuth);
router.post('/chat', chat);
module.exports = router;