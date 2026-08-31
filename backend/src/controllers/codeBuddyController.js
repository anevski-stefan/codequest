const {
  CodeBuddyService
} = require('../services/codeBuddyService.js');
const aiKeyStore = require('../utils/aiKeyStore');
const {
  badRequest,
  internal,
  sendError
} = require('../utils/httpError');
const codeBuddyService = new CodeBuddyService();
exports.chat = async (req, res) => {
  try {
    const {
      message,
      context,
      messages,
      service
    } = req.body;
    if (!message) {
      return badRequest(res, 'Message is required');
    }
    if (typeof service !== 'string' || !service.trim()) {
      return badRequest(res, 'AI service is required');
    }
    const normalizedService = service.toLowerCase();
    if (!['chatgpt', 'gemini'].includes(normalizedService)) {
      return badRequest(res, 'Invalid AI service specified');
    }
    const apiKey = await aiKeyStore.getAiKey(req.user.id, normalizedService);
    if (!apiKey) {
      return badRequest(res, 'No API key configured. Add your key in Settings.');
    }
    try {
      const response = await codeBuddyService.getResponse(message, context, messages, req.user.accessToken, normalizedService, apiKey);
      if (!response) {
        throw new Error(`No response from ${service} service`);
      }
      res.json({
        message: response,
        timestamp: new Date()
      });
    } catch (serviceError) {
      console.error(`${service} service error:`, serviceError.message);
      return sendError(res, 503, `${service} service error: please try again or switch services`, process.env.NODE_ENV !== 'production' ? serviceError.message : undefined);
    }
  } catch (error) {
    console.error('Chat error:', error.message, error.response?.data);
    return internal(res, 'Failed to process chat message', process.env.NODE_ENV !== 'production' ? error.message : undefined);
  }
};