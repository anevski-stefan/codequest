-- AI provider API keys (chatgpt / gemini) stored per user, encrypted at rest.
-- A composite primary key on (user_id, service) gives us a natural target for
-- atomic upserts (INSERT ... ON CONFLICT), avoiding read-modify-write races.
CREATE TABLE IF NOT EXISTS ai_keys (
  user_id text NOT NULL,
  service text NOT NULL,
  encrypted_key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, service)
);
