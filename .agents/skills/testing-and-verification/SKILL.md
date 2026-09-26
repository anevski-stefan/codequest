---
name: testing-and-verification
description: What to test and which checks to run before declaring Code Quest work done. Use when writing tests, adding logic to a backend service, fixing a bug, finishing any change, or deciding whether something is verified. Covers node:test for the backend, extracting pure functions, the frontend typecheck/lint/build gates, and how to report verification honestly.
metadata:
  project: codequest
  version: "1.0"
---

# Testing and verification

## Gates (run all that apply, every time)

| Changed | Run | From |
|---|---|---|
| Anything in `frontend/` | `npx tsc --noEmit -p .` → `npx eslint src` → `npm run build` | `frontend/` |
| Anything in `backend/` | `npm test`, then `node -e "require('./src/routes/<router>')"` for touched routers | `backend/` |
| UI behaviour | skill `ui-verification` | |
| Schema | skill `supabase-migrations` (dry run + list) | `backend/` |

Lint baseline: exactly one known warning (`contexts/ThemeContext.tsx`, fast refresh).
Anything else is yours to fix.

## Backend tests

- Runner: built-in `node:test` + `node:assert/strict`. Files: `backend/test/*.test.js`.
  No network, no Supabase, no GitHub — tests must run offline in well under a second.
- Test the **pure function**, not the controller. If logic is tangled with I/O, extract it
  first (`classifyClaim(issueNode, now)`, `computeMergeStats(closed, open, now)`), and pass
  `now` in so tests are deterministic.
- For every metric or classifier, write a test per pitfall you know about (bots, small
  samples, outliers, stale items, malicious input). A bug fix adds a test that fails
  without the fix.
- Security-relevant builders (queries, prompts) get a test that hostile input stays inert,
  e.g. GraphQL input only in `variables`.

## Frontend

There is no test runner yet. Until there is: keep logic in hooks/utils as pure functions
so it can be tested later, and verify behaviour in the browser (mock mode).

## Reporting

Say exactly what ran and what passed ("tsc, eslint, build pass; backend 26/26"). Say what
you could not verify and why ("not tested against live GitHub: no browser session").
Never write "should work" in place of a check you could have run.
