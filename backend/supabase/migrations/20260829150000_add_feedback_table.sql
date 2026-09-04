-- User feedback submissions.
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  email text,
  created_at timestamptz DEFAULT now()
);
