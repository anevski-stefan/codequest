const express = require('express');
const router = express.Router();
const supabaseService = require('../services/supabaseService');

// Add this line to enable JSON body parsing
router.use(express.json());

// Get all chats for a user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get chats from Supabase
    const data = await supabaseService.getUserChats(userId);
    
    if (!data) {
      return res.status(404).json({ error: 'No chats found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

// Delete a chat
router.delete('/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    // Get userId from auth token or request
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await supabaseService.deleteChat(chatId, userId);
    
    if (!result) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.status(200).json({ message: 'Chat deleted successfully' });
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

// Save new chat
router.post('/', async (req, res) => {
  try {
    const { messages, userId, title } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const data = await supabaseService.saveChat(userId, messages, title);
    res.status(201).json(data);
  } catch (error) {
    console.error('Error saving chat:', error);
    res.status(500).json({ error: 'Failed to save chat' });
  }
});

module.exports = router;