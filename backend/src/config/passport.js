const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;

// Make supabaseService optional
let supabaseService;
try {
  supabaseService = require('../services/supabaseService');
} catch (error) {
  console.warn('Supabase service not configured - user data will not be stored');
}

// Only set up GitHub strategy if credentials are available
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  // Passport GitHub strategy configuration
  passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/github/callback",
      scope: ['read:user', 'user:email'],
      proxy: true
    },
    async function(accessToken, refreshToken, profile, done) {
      try {
        let userData = profile;
        
        // Only try to use Supabase if it's configured
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
    }
  ));
} else {
  console.warn('GitHub OAuth credentials not found - authentication will not work');
}

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from the session
passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = passport; 