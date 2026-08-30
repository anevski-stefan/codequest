const passport = require('passport');
const axios = require('axios');
const clientUrl = () => process.env.CLIENT_URL || 'http://localhost:5173';
const githubAuth = passport.authenticate('github', {
  scope: ['read:user', 'user:email'],
  state: true
});
const githubCallback = [passport.authenticate('github', {
  failureRedirect: `${clientUrl()}/login`,
  session: true,
  state: true
}), (req, res) => {
  res.redirect(`${clientUrl()}/auth/callback`);
}];
const getMe = async (req, res) => {
  if (!req.user || !req.user.accessToken) {
    return res.status(401).json({
      error: 'Unauthorized'
    });
  }
  try {
    const {
      data
    } = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${req.user.accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'CodeQuest'
      }
    });
    res.json({
      user: data
    });
  } catch (error) {
    if (error.response?.status === 401) {
      return res.status(401).json({
        error: 'Unauthorized'
      });
    }
    console.error('getMe error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to fetch user'
    });
  }
};
const logout = async (req, res) => {
  const accessToken = req.user?.accessToken;
  if (accessToken) {
    try {
      await revokeGitHubToken(accessToken);
    } catch (error) {
      console.warn('Failed to revoke GitHub token on logout:', error.message);
    }
  }
  if (req.logout) {
    req.logout(() => {});
  }
  if (req.session) {
    req.session.destroy(() => {});
  }
  res.clearCookie('connect.sid');
  res.json({
    message: 'Logged out'
  });
};
async function revokeGitHubToken(accessToken) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) return;
  await axios({
    method: 'DELETE',
    url: `https://api.github.com/applications/${clientId}/token`,
    auth: {
      username: clientId,
      password: clientSecret
    },
    data: {
      access_token: accessToken
    },
    headers: {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'CodeQuest'
    }
  });
}
module.exports = {
  githubAuth,
  githubCallback,
  getMe,
  logout
};