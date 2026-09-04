-- Core user table. id and github_id are the GitHub OAuth profile id (text).
-- Access/refresh tokens are added by a later migration and stored encrypted at rest.
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  github_id text NOT NULL,
  username text,
  avatar_url text,
  email text,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_github_id_idx ON users (github_id);
