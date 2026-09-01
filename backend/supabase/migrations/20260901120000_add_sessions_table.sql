-- Production session storage table (used by SupabaseSessionStore when SESSION_STORE=supabase).
-- Run this migration via the Supabase SQL editor (or supabase db push) before enabling
-- SESSION_STORE=supabase, otherwise session writes will fail.
CREATE TABLE IF NOT EXISTS sessions (
  sid text PRIMARY KEY,
  sess jsonb NOT NULL,
  expire timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_expire_idx ON sessions (expire);