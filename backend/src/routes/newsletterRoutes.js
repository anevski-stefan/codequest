const express = require('express');
const router = express.Router();
const { subscribe } = require('../controllers/newsletterController');

router.post('/subscribe', express.json(), subscribe);

module.exports = router;