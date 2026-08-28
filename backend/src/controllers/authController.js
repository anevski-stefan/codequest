const passport = require('passport');
const crypto = require('crypto');
const exchangeCodes = new Map();
const CODE_TTL_MS = 60 * 1000;
const githubAuth = passport.authenticate('github', {
  scope: ['read:user', 'user:email'],
  state: true
});
const githubCallback = [passport.authenticate('github', {
  failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`,
  session: true,
  state: true
}), (req, res) => {
  const token = req.user?.accessToken;
  if (!token) {
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login`);
  }
  const code = crypto.randomBytes(24).toString('hex');
  exchangeCodes.set(code, {
    token,
    expires: Date.now() + CODE_TTL_MS
  });
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  res.redirect(`${clientUrl}/auth/callback?code=${code}`);
}];
const exchangeCode = (req, res) => {
  try {
    const {
      code
    } = req.body;
    if (!code) {
      return res.status(400).json({
        error: 'Missing code'
      });
    }
    const entry = exchangeCodes.get(code);
    exchangeCodes.delete(code);
    if (!entry || entry.expires <= Date.now()) {
      return res.status(401).json({
        error: 'Invalid or expired code'
      });
    }
    res.json({
      token: entry.token
    });
  } catch (error) {
    console.error('Code exchange error:', error);
    res.status(500).json({
      error: 'Code exchange failed'
    });
  }
};
module.exports = {
  githubAuth,
  githubCallback,
  exchangeCode
};