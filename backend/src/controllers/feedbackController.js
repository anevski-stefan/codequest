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
    console.error('Feedback submission error:', error);
    res.status(500).json({
      error: 'Failed to send feedback',
      message: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};