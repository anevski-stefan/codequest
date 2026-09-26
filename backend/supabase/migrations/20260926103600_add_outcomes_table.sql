CREATE TABLE IF NOT EXISTS outcomes (
  id bigserial PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  owner text,
  repo text,
  issue_number integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outcomes_user_id_idx ON outcomes(user_id);
