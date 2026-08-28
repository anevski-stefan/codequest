const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
let supabaseService;
try {
  supabaseService = require('../services/supabaseService');
} catch (error) {
  console.warn('Supabase service not configured - user data will not be stored');
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
      let userData = profile;
      if (supabaseService) {
        try {
          userData = await supabaseService.createOrUpdateUser(profile);
        } catch (error) {
          console.warn('Failed to store user in Supabase:', error.message);
        }
      }
      const user = {
        id: userData.id || profile.id,
        username: profile.username,
        accessToken: accessToken,
        avatar_url: profile._json.avatar_url,
        email: profile.emails?.[0]?.value
      };
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
} else {
  console.warn('GitHub OAuth credentials not found - authentication will not work');
}
passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user);
});
module.exports = passport;