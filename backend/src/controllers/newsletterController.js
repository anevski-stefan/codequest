const nodemailer = require('nodemailer');
const axios = require('axios');

exports.subscribe = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required'
      });
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format'
      });
    }

    // If Mailchimp is configured, use it
    if (process.env.MAILCHIMP_API_KEY && process.env.MAILCHIMP_LIST_ID && process.env.MAILCHIMP_SERVER) {
      const data = {
        email_address: email,
        status: 'subscribed'
      };

      try {
        await axios.post(
          `https://${process.env.MAILCHIMP_SERVER}.api.mailchimp.com/3.0/lists/${process.env.MAILCHIMP_LIST_ID}/members`,
          data,
          {
            headers: {
              Authorization: `apikey ${process.env.MAILCHIMP_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        return res.status(200).json({
          message: 'Successfully subscribed to newsletter!'
        });
      } catch (error) {
        // Handle Mailchimp specific errors
        if (error.response?.status === 400 && error.response?.data?.title === 'Member Exists') {
          return res.status(400).json({
            error: 'This email is already subscribed to our newsletter'
          });
        }
        throw error;
      }
    } else {
      // Fallback to storing in Supabase if Mailchimp isn't configured
      const { supabase } = require('../config/supabase');
      
      const { error: supabaseError } = await supabase
        .from('newsletter_subscribers')
        .insert([{ email, subscribed_at: new Date().toISOString() }]);

      if (supabaseError) {
        if (supabaseError.code === '23505') { // Unique violation
          return res.status(400).json({
            error: 'This email is already subscribed to our newsletter'
          });
        }
        throw supabaseError;
      }

      return res.status(200).json({
        message: 'Successfully subscribed to newsletter!'
      });
    }
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    res.status(500).json({
      error: 'Failed to subscribe to newsletter',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};