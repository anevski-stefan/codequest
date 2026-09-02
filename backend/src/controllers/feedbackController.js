const MAX_MESSAGE_LENGTH = 5000;
const { badRequest, asyncHandler } = require('../utils/httpError');
exports.submit = asyncHandler(async (req, res) => {
  const {
    message
  } = req.body;
  if (!message || !message.trim()) {
    return badRequest(res, 'Message is required');
  }
  if (typeof message !== 'string' || message.length > MAX_MESSAGE_LENGTH) {
    return badRequest(res, `Message must be a string of at most ${MAX_MESSAGE_LENGTH} characters`);
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
});