const { CodeBuddyService } = require('../services/codeBuddyService.js');

const codeBuddyService = new CodeBuddyService();

exports.chat = async (req, res) => {
  try {
    const { message, context, messages, service, apiKey } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!service || !apiKey) {
      return res.status(400).json({ error: 'AI service and API key are required' });
    }

    try {
      const response = await codeBuddyService.getResponse(
        message,
        context,
        messages,
        req.user.accessToken,
        service,
        apiKey
      );

      res.json({
        message: response,
        timestamp: new Date()
      });
    } catch (serviceError) {
      console.error('Service error:', serviceError);
      res.status(500).json({ 
        error: 'AI service error',
        details: serviceError.message
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}; 