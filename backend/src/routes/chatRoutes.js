const express = require('express');
const {
  authenticateToken
} = require('../middleware/auth');
const supabaseService = require('../services/supabaseService');
const router = express.Router();
router.use(express.json());
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const {
      userId
    } = req.params;
    if (req.user?.id !== userId) {
      return res.status(403).json({
        error: 'Unauthorized access'
      });
    }
    const data = await supabaseService.getUserChats(userId);
    res.json(data);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({
      error: 'Failed to fetch chats'
    });
  }
});
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      messages,
      userId,
      title
    } = req.body;
    if (req.user?.id !== userId) {
      return res.status(403).json({
        error: 'Unauthorized access'
      });
    }
    const data = await supabaseService.saveChat(userId, messages, title);
    res.json(data);
  } catch (error) {
    console.error('Error saving chat:', error);
    res.status(500).json({
      error: 'Failed to save chat'
    });
  }
});
module.exports = router;