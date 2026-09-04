-- Chat history for the in-app assistant. messages is a JSON array of chat messages.
CREATE TABLE IF NOT EXISTS chat_histories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  title text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_histories_user_id_idx ON chat_histories (user_id);
