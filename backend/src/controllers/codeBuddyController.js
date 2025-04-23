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

    // Validate service type
    if (!['CHATGPT', 'GEMINI'].includes(service.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid AI service specified' });
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

      if (!response) {
        throw new Error(`No response from ${service} service`);
      }

      res.json({
        message: response,
        timestamp: new Date()
      });
    } catch (serviceError) {
      console.error(`${service} service error:`, serviceError);
      res.status(503).json({ 
        error: `${service} service error`,
        message: 'Please try again or switch services',
        details: process.env.NODE_ENV === 'development' ? serviceError.message : undefined
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}; 