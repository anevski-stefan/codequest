const supabaseService = require('../services/supabaseService');
const { badRequest, sendError, asyncHandler } = require('../utils/httpError');

exports.getUserChats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const data = await supabaseService.getUserChats(userId);
  res.json(data);
});

exports.deleteChat = asyncHandler(async (req, res) => {
  const {
    chatId
  } = req.params;
  const userId = req.user?.id;
  if (!userId) {
    return sendError(res, 401, 'Authentication required');
  }
  await supabaseService.deleteChat(chatId, userId);
  res.status(200).json({
    message: 'Chat deleted successfully'
  });
});

exports.saveChat = asyncHandler(async (req, res) => {
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
});