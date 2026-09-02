const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.get('/', chatController.getUserChats);
router.delete('/:chatId', chatController.deleteChat);
router.post('/', chatController.saveChat);

module.exports = router;