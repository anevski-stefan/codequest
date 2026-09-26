# Backend rules

Applies to everything under `backend/`. Activate `backend-api` for routes/services,
`github-signals` for GitHub data, `ai-features` for LLM calls, `supabase-migrations`
for schema changes.

## Shape of a feature

`routes/*.js` (auth + rate limit + path) → `controllers/*.js` (validate, call service,
respond) → `services/*.js` (logic, GitHub/Supabase/AI calls). Pure logic is exported from
the service and covered by `test/*.test.js`.

## Rules

- Wrap handlers in `asyncHandler`; send errors with `badRequest` / `sendError` from
  `utils/httpError.js`. Never leak stack traces or provider error bodies verbatim.
- Validate params with `utils/validateParams.js` (`isValidOwner`, `isValidRepo`) and
  bound every array/number from the client (see `controllers/claimsController.js`).
- GitHub: `services/githubService.js` only (it caches GETs and retries). GraphQL goes to
  `POST /graphql` with **variables**; batch with aliases (see `services/claimService.js`).
- AI: `services/aiService.js` only (`resolveProvider` → 402 if no key, then
  `streamToResponse`). Never call Gemini/OpenAI directly from a controller.
- Supabase: `getSupabase()` (service key). Check `{ error }` on every call and log it.
- Fire-and-forget endpoints (tracking) return 204 and never fail the user's action.
- New router-level limits go in `middleware/rateLimiter.js`.
- `node --test`: keep tests fast and offline; test the pure function, not the network.
