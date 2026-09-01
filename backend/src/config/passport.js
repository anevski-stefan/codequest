const passport = require('passport');
const logger = require('../utils/logger');
const GitHubStrategy = require('passport-github2').Strategy;
let supabaseService;
try {
  supabaseService = require('../services/supabaseService');
} catch (error) {
  logger.warn('Supabase service not configured - user data will not be stored');
}
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL || "http://localhost:3000/auth/github/callback",
    scope: ['read:user', 'user:email'],
    proxy: true
  }, async function (accessToken, refreshToken, profile, done) {
    try {
      if (!supabaseService) {
        logger.error('Supabase is required to persist the GitHub access token server-side. Configure SUPABASE_URL and SUPABASE_SERVICE_KEY.');
        return done(new Error('Authentication is disabled: no server-side token store configured'), null);
      }
      let userData = profile;
      try {
        userData = await supabaseService.createOrUpdateUser(profile);
        await supabaseService.persistAccessToken(profile.id, accessToken, refreshToken);
      } catch (error) {
        logger.error('Failed to persist user/auth data in Supabase:', error.message);
        return done(error, null);
      }
      return done(null, {
        id: userData.id || profile.id
      });
    } catch (error) {
      return done(error, null);
    }
  }));
} else {
  logger.warn('GitHub OAuth credentials not found - authentication will not work');
}
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  if (!supabaseService) {
    return done(null, null);
  }
  try {
    const user = await supabaseService.getUserWithToken(id);
    if (!user || !user.accessToken) {
      return done(null, null);
    }
    done(null, {
      id: user.id || user.github_id,
      username: user.username,
      avatar_url: user.avatar_url,
      email: user.email,
      accessToken: user.accessToken
    });
  } catch (error) {
    logger.error('deserializeUser error:', error.message);
    done(error, null);
  }
});
module.exports = passport;