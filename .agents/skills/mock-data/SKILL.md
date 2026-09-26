---
name: mock-data
description: Code Quest's frontend mock mode (VITE_USE_MOCK_DATA) and its fixtures. Use when adding or changing any backend endpoint the frontend calls, when a page shows "[mock] No handler" or 404 in mock mode, when fixtures need new data, or when turning mock mode on or off for UI work.
metadata:
  project: codequest
  version: "1.0"
---

# Mock data

Mock mode lets the whole UI run without the backend or GitHub (no rate limits, no login).

## How it works

- Flag: `VITE_USE_MOCK_DATA=true|false` in `frontend/.env` (documented in `.env.example`),
  read via `src/mocks/flag.ts`. Optional `VITE_MOCK_LATENCY` (ms, default 350).
- `src/services/github.ts` swaps the shared axios instance's adapter for
  `src/mocks/adapter.ts` when the flag is on. The import is lazy, so fixtures are absent
  from builds with the flag off.
- SSE features (`explainIssue`, `onboardRepo`) stream text from `src/mocks/stream.ts`.
- Fixtures live in `src/mocks/data.ts`; they are seeded/deterministic so reloads match.
- A "Mock data" badge shows in the header while it's on.

## Adding a route

Every new endpoint the frontend calls needs a mock, in the same change:

```ts
// src/mocks/adapter.ts, inside `routes`
['post', /^\/api\/issues\/claims$/, (match, params, body) => ({ claims: … })],
['get',  /^\/api\/repos\/([^/]+)\/([^/]+)\/merge-likelihood$/, m => likelihoodFor(`${m[1]}/${m[2]}`)],
['post', /^\/api\/activity\/track$/, () => ({ __status: 204, data: null })],
```

- Return the **same shape** the backend returns (copy it from the controller).
- Use `status(code, body)` for errors and `withHeaders(data, headers)` when the frontend
  reads headers (e.g. GitHub `link` pagination).
- Make data deterministic from the input (hash the id/number) and cover every state the
  UI has: e.g. claims produce free / requested / in progress / stale.
- Mutations update the in-memory `state` object so the UI reflects them during the session.
- Keep a way to reach error states (e.g. `/explore/missing/x` returns 404).

## Rules

- Mock mode is for development only. **Always set the flag back to `false`** before you
  finish, then build and confirm `grep -l "Mock Developer" dist/assets/*.js` finds nothing.
- Don't point fixtures at real people: user avatars are generated initials; real org
  names/logos are fine.
- A missing handler logs `[mock] No handler for …` and returns 404 — fix it, don't ignore it.
