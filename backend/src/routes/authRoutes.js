const express = require('express');
const passport = require('passport');
const router = express.Router();

// Auth routes
router.get('/github',
  passport.authenticate('github', { scope: ['read:user', 'user:email'] })
);

router.get('/github/callback', 
  passport.authenticate('github', { 
    failureRedirect: 'http://localhost:5173/login',
    session: true
  }),
  function(req, res) {
    // Successful authentication
    const token = req.user.accessToken;
    res.redirect(`http://localhost:5173/auth/callback?token=${token}`);
  }
);

module.exports = router;