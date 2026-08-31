-- Hackathons persisted to Postgres instead of an in-memory Map, so they survive
-- server restarts and are shared across instances. The id is a stable slug; the
-- url is a natural unique key used to upsert Devpost records without duplicating.
CREATE TABLE IF NOT EXISTS hackathons (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  start_date text,
  end_date text,
  url text UNIQUE,
  source text NOT NULL DEFAULT 'manual',
  location text,
  prize text,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  participant_count integer NOT NULL DEFAULT 0,
  submission_period text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hackathons_source_idx ON hackathons (source);
CREATE INDEX IF NOT EXISTS hackathons_start_date_idx ON hackathons (start_date);
