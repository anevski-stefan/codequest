const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const {
  proxy
} = require('../controllers/githubProxyController');
router.get('/:path(*)', requireAuth, proxy);
module.exports = router;