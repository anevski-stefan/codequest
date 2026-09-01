const axios = require('axios');
const logger = require('../utils/logger');
exports.subscribe = async (req, res) => {
  try {
    const {
      email
    } = req.body;
    if (!email) {
      return res.status(400).json({
        error: 'Email is required'
      });
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }
    if (process.env.MAILCHIMP_API_KEY && process.env.MAILCHIMP_LIST_ID && process.env.MAILCHIMP_SERVER) {
      const data = {
        email_address: email,
        status: 'pending'
      };
      try {
        await axios.post(`https://${process.env.MAILCHIMP_SERVER}.api.mailchimp.com/3.0/lists/${process.env.MAILCHIMP_LIST_ID}/members`, data, {
          headers: {
            Authorization: `apikey ${process.env.MAILCHIMP_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        return res.status(200).json({
          message: 'Please check your email to confirm your subscription.'
        });
      } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.title === 'Member Exists') {
          return res.status(200).json({
            message: 'If this email is not already subscribed, a confirmation link has been sent.'
          });
        }
        throw error;
      }
    } else {
      const {
        getSupabase
      } = require('../config/supabase');
      const supabase = getSupabase();
      const {
        error: supabaseError
      } = await supabase.from('newsletter_subscribers').insert([{
        email,
        subscribed_at: new Date().toISOString()
      }]);
      if (supabaseError) {
        if (supabaseError.code === '23505') {
          return res.status(200).json({
            message: 'If this email is not already subscribed, a confirmation has been processed.'
          });
        }
        throw supabaseError;
      }
      return res.status(200).json({
        message: 'If this email is not already subscribed, a confirmation link has been sent.'
      });
    }
  } catch (error) {
    logger.error('Newsletter subscription error:', error);
    res.status(500).json({
      error: 'Failed to subscribe to newsletter',
      message: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};