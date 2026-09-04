const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const requireAuth = require('../middleware/requireAuth');

router.use(requireAuth);
router.get('/', chatController.getUserChats);
router.delete('/:chatId', chatController.deleteChat);
router.post('/', chatController.saveChat);
router.put('/:chatId', chatController.updateChat);

module.exports = router;