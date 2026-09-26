---
name: backend-api
description: Conventions for the Code Quest Express backend. Use when adding or changing routes, controllers, services, middleware, validation, error handling, rate limiting, caching, or Supabase reads/writes in backend/src. Covers the routes→controllers→services layering, asyncHandler and httpError helpers, parameter validation, response codes, githubService usage and fire-and-forget endpoints.
metadata:
  project: codequest
  version: "1.0"
---

# Backend API

## Layering

```
routes/<area>Routes.js      auth, rate limit, path → handler
controllers/<x>Controller.js validate input, call a service, shape the response
services/<x>Service.js       business logic, GitHub / Supabase / AI calls
utils/                       httpError, validateParams, logger, pagination, aiKeyStore
```

Put logic that can be tested without network in the service as an exported **pure
function** (e.g. `classifyClaim`, `computeMergeStats`) and test it in `test/`.

## Adding an endpoint — checklist

1. Route in the right router; `requireAuth` is applied at router level for private data.
2. Rate limit if the endpoint is write-heavy, costly or public (`middleware/rateLimiter.js`,
   `makeLimiter({ max, keyGenerator: userAwareKeyGenerator })`).
3. Controller wrapped in `asyncHandler`.
4. **Validate everything from the client**:
   - `isValidOwner`, `isValidRepo` for GitHub names; `Number.isInteger(n) && n > 0` for numbers
   - bound arrays (`issues.length <= 50`), string lengths, and enums (whitelist with a `Set`)
   - reject with `badRequest(res, 'Human message')`
5. Service does the work; controller returns JSON or `204` for fire-and-forget.
6. Add a mock route in `frontend/src/mocks/adapter.ts` (skill `mock-data`).
7. Add/extend `node:test` for the pure logic.

## Errors

- Use `badRequest` / `sendError(res, status, message)` from `utils/httpError.js`.
- Messages are written for the user who will see them in the UI ("No AI key configured.
  Add a Gemini or OpenAI key in Settings…"), not for developers.
- Log details with `logger.error/warn(message, { status, message })` — never log tokens,
  keys, or full request bodies.
- GitHub failures surface as `GitHubApiError`; let `asyncHandler` handle them unless you
  can give a better message (404 → "not found", 403/429 → "rate limit").

## GitHub access

- Always `githubService.request(token, method, path, options)` — it caches GETs
  (`cacheTtlMs`), retries retryable statuses and sets headers. Use `req.user.accessToken`.
- Prefer one GraphQL request with aliases over N REST calls (see `services/claimService.js`).
- Details and metric pitfalls: skill `github-signals`.

## Supabase

- `getSupabase()` returns a service-key client (bypasses RLS). Only the backend talks to
  Supabase.
- Check `{ error }` on **every** call; log it. Use `.maybeSingle()` when a row may not exist.
- Upserts need `onConflict` matching the primary key.
- Schema changes: skill `supabase-migrations`.

## Caching

- In-process caches (Map + TTL) are fine for derived data that's cheap to recompute
  (claims: 20 min). Bound their size.
- Cross-user caches in Supabase (merge likelihood: 24h) must never serve private-repo data
  to someone without access: check access first, and don't cache private repos.

## Fire-and-forget endpoints

Tracking and similar calls must never break the user's action: validate, insert, log
errors, return `204`. The frontend calls them without awaiting and swallows failures.
