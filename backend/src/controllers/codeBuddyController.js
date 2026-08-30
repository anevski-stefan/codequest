const {
  CodeBuddyService
} = require('../services/codeBuddyService.js');
const aiKeyStore = require('../utils/aiKeyStore');
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
      return res.status(400).json({
        error: 'Message is required'
      });
    }
    if (!service) {
      return res.status(400).json({
        error: 'AI service is required'
      });
    }
    const normalizedService = service.toLowerCase();
    if (!['chatgpt', 'gemini'].includes(normalizedService)) {
      return res.status(400).json({
        error: 'Invalid AI service specified'
      });
    }
    const apiKey = await aiKeyStore.getAiKey(req.user.id, normalizedService);
    if (!apiKey) {
      return res.status(400).json({
        error: 'No API key configured. Add your key in Settings.'
      });
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
      res.status(503).json({
        error: `${service} service error`,
        message: 'Please try again or switch services',
        details: process.env.NODE_ENV === 'development' ? serviceError.message : undefined
      });
    }
  } catch (error) {
    console.error('Chat error:', error.message, error.response?.data);
    res.status(500).json({
      error: 'Failed to process chat message',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};