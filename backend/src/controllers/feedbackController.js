const MAX_MESSAGE_LENGTH = 5000;
const logger = require('../utils/logger');
exports.submit = async (req, res) => {
  try {
    const {
      message
    } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({
        error: 'Message is required'
      });
    }
    if (typeof message !== 'string' || message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        error: `Message must be a string of at most ${MAX_MESSAGE_LENGTH} characters`
      });
    }
    const {
      getSupabase
    } = require('../config/supabase');
    const supabase = getSupabase();
    const {
      error: supabaseError
    } = await supabase.from('feedback').insert([{
      message: message.trim(),
      email: req.user?.email || null,
      created_at: new Date().toISOString()
    }]);
    if (supabaseError) {
      throw supabaseError;
    }
    return res.status(200).json({
      message: 'Feedback sent successfully!'
    });
  } catch (error) {
    logger.error('Feedback submission error:', error);
    res.status(500).json({
      error: 'Failed to send feedback',
      message: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};