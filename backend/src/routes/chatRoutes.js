const express = require('express');
const router = express.Router();
const supabaseService = require('../services/supabaseService');
router.use(express.json({ limit: '1mb' }));
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await supabaseService.getUserChats(userId);
    if (!data) {
      return res.status(404).json({
        error: 'No chats found'
      });
    }
    res.json(data);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({
      error: 'Failed to fetch chats'
    });
  }
});
router.delete('/:chatId', async (req, res) => {
  try {
    const {
      chatId
    } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }
    const result = await supabaseService.deleteChat(chatId, userId);
    if (!result) {
      return res.status(404).json({
        error: 'Chat not found'
      });
    }
    res.status(200).json({
      message: 'Chat deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({
      error: 'Failed to delete chat'
    });
  }
});
router.post('/', async (req, res) => {
  try {
    const {
      messages,
      title
    } = req.body;
    const userId = req.user.id;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Invalid messages format'
      });
    }
    const data = await supabaseService.saveChat(userId, messages, title);
    res.status(201).json(data);
  } catch (error) {
    console.error('Error saving chat:', error);
    res.status(500).json({
      error: 'Failed to save chat'
    });
  }
});
module.exports = router;