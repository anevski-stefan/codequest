const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { getSupabase } = require('../config/supabase');
const { asyncHandler, serverError, notFound } = require('../utils/httpError');

router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const supabase = getSupabase();
  const userId = req.user.id;
  const limit = parseInt(req.query.limit) || 50;
  
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return serverError(res, error.message);
  }

  const { count: unreadCount, error: countError } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (countError) {
    return serverError(res, countError.message);
  }

  res.json({ notifications, unreadCount });
}));

router.put('/:id/read', asyncHandler(async (req, res) => {
  const supabase = getSupabase();
  const userId = req.user.id;
  const notificationId = req.params.id;

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) {
    return serverError(res, error.message);
  }

  res.json({ success: true });
}));

router.put('/read-all', asyncHandler(async (req, res) => {
  const supabase = getSupabase();
  const userId = req.user.id;

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    return serverError(res, error.message);
  }

  res.json({ success: true });
}));

module.exports = router;
