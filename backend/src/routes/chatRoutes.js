const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const supabaseService = require('../services/supabaseService');

const router = express.Router();

// Add this line to enable JSON body parsing
router.use(express.json());

// Get all chats for a user
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify the requesting user matches the userId
    if (req.user?.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const data = await supabaseService.getUserChats(userId);
    res.json(data);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

// Save new chat
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { messages, userId, title } = req.body;

    // Verify the requesting user matches the userId
    if (req.user?.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const data = await supabaseService.saveChat(userId, messages, title);
    res.json(data);
  } catch (error) {
    console.error('Error saving chat:', error);
    res.status(500).json({ error: 'Failed to save chat' });
  }
});

module.exports = router;