const express = require('express');
const router = express.Router();
const supabaseService = require('../services/supabaseService');
const { badRequest, notFound, sendError, asyncHandler } = require('../utils/httpError');
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const data = await supabaseService.getUserChats(userId);
  if (!data) {
    return notFound(res, 'No chats found');
  }
  res.json(data);
}));
router.delete('/:chatId', asyncHandler(async (req, res) => {
  const {
    chatId
  } = req.params;
  const userId = req.user?.id;
  if (!userId) {
    return sendError(res, 401, 'Authentication required');
  }
  const result = await supabaseService.deleteChat(chatId, userId);
  if (!result) {
    return notFound(res, 'Chat not found');
  }
  res.status(200).json({
    message: 'Chat deleted successfully'
  });
}));
router.post('/', asyncHandler(async (req, res) => {
  const {
    messages,
    title
  } = req.body;
  const userId = req.user.id;
  if (!messages || !Array.isArray(messages)) {
    return badRequest(res, 'Invalid messages format');
  }
  const data = await supabaseService.saveChat(userId, messages, title);
  res.status(201).json(data);
}));
module.exports = router;