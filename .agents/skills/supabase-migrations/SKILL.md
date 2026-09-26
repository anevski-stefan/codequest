---
name: supabase-migrations
description: Creating and applying Supabase Postgres schema changes for Code Quest. Use when adding or altering a table, index, column or RLS setting, writing a file in backend/supabase/migrations, running supabase db push, or when the owner asks how to apply a migration.
metadata:
  project: codequest
  version: "1.0"
---

# Supabase migrations

The project is linked with the Supabase CLI (run commands from `backend/`), and remote
migration history is tracked. The backend is the only client and uses the service key.

## Write the migration

1. File: `backend/supabase/migrations/<YYYYMMDDHHMMSS>_<verb>_<thing>.sql`
   (e.g. `20260926103600_add_outcomes_table.sql`). Timestamp must be later than every
   existing one.
2. Make it safe to run against a database that may be in an unexpected state:
   - `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`
   - If an earlier draft of a **cache-only** table might exist with the wrong shape,
     `DROP TABLE IF EXISTS` first. Never drop tables holding user data.
3. **Enable RLS on every new table**: `ALTER TABLE x ENABLE ROW LEVEL SECURITY;`
   The service key bypasses RLS, so the backend is unaffected, and the table stays off the
   public PostgREST API. No policies are needed unless a client reads it directly.
4. Foreign keys to `users(id)` are `text` (GitHub id) with `ON DELETE CASCADE` for
   per-user data.
5. Comment at the top: what the table is for and who writes it.
6. Never edit a migration that is already applied remotely — add a new one.

## Apply it

```bash
cd backend
supabase migration list            # local vs remote; only yours should be missing
supabase db push --dry-run         # must list exactly the migrations you expect
supabase db push                   # applies them and records history
supabase migration list            # confirm remote now has them
```

Stop and ask the owner if the dry run lists anything you didn't write, or if the project
is not linked (`supabase/.temp/project-ref` missing). Applying to the production database
is an outward action: do it when asked, not as a side effect.

## Verify

Read-only check with the service client:

```bash
node -e "require('dotenv').config(); const {getSupabase}=require('./src/config/supabase');
getSupabase().from('<table>').select('<cols>').limit(1).then(r=>console.log(r.error?.message ?? 'ok'))"
```

## Code that uses the table

- Check `{ error }` on every call and log it.
- `.maybeSingle()` for optional rows; `upsert(..., { onConflict: '<pk cols>' })`.
- Normalise keys you look up by (lowercase `owner`/`repo`).

## Known gap

Older tables (`users`, `ai_keys`, `sessions`, `notifications`, …) were created without
RLS. Enabling it is a separate, owner-approved change.
