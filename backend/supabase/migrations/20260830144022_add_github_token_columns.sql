-- Store the GitHub access/refresh tokens server-side, encrypted at rest.
-- The session cookie only carries the user id; the token lives here and is
-- fetched fresh on every authenticated request (see config/passport.js).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS github_token text,
  ADD COLUMN IF NOT EXISTS github_refresh_token text;
