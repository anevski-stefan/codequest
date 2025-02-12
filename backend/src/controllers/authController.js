const passport = require('passport');

exports.githubAuth = passport.authenticate('github', { 
  scope: ['read:user', 'user:email'] 
});

exports.githubCallback = [
  passport.authenticate('github', { 
    failureRedirect: 'http://localhost:5173/login',
    session: true
  }),
  (req, res) => {
    // Successful authentication
    const token = req.user.accessToken;
    res.redirect(`http://localhost:5173/auth/callback?token=${token}`);
  }
];