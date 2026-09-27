-- dedup_key holds the PR shepherd's plan key for a notification, so the service
-- can tell a first report from a repeat. Only prShepherdService writes it; every
-- other notification source leaves it null and is excluded from the index below.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS dedup_key text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup_key
  ON notifications(user_id, dedup_key)
  WHERE dedup_key IS NOT NULL;
