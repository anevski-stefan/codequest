-- Newsletter signups. email is unique; a duplicate insert (23505) is handled in code.
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  email text PRIMARY KEY,
  subscribed_at timestamptz DEFAULT now()
);
