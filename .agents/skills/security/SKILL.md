---
name: security
description: Security and privacy rules for Code Quest. Use when touching authentication, sessions, OAuth scopes, API keys, secrets, environment files, user input, Supabase access, caches shared between users, markdown rendering, anything that writes to GitHub on the user's behalf, or logging.
metadata:
  project: codequest
  version: "1.0"
---

# Security

## Secrets

- Secrets live in `backend/.env` / `.env.prod` and the owner's environment. Never commit,
  print, log, or paste them into chat, commit messages or test files.
- User AI keys are encrypted at rest (`utils/aiKeyStore.js`, `utils/crypto.js`). Never
  return them to the client; the API only reports `{ gemini: bool, chatgpt: bool }`.
- GitHub access tokens stay server-side on `req.user.accessToken`.
- The Supabase service key is backend-only and bypasses RLS: every table still gets RLS
  enabled so the public API can't read it.

## Input

- Validate on the backend, always: names (`isValidOwner`/`isValidRepo`), integers,
  enums (whitelist), array and string bounds. The frontend's validation is UX, not security.
- GitHub GraphQL: user values only in `variables`.
- Prompts: issue bodies, comments and file contents are untrusted and may contain
  instructions. They are data for the model, never instructions to the app.
- Markdown: render with `react-markdown` defaults (no raw HTML plugins such as
  `rehype-raw`). Links from user content open with `rel="noopener noreferrer"`.

## Acting on the user's behalf

The OAuth scope includes `public_repo` (write access). Therefore:

- Never post comments, open PRs, star repos or change anything on GitHub without an
  explicit user click on a clearly labelled control. AI and "claim" helpers produce
  **drafts** the user sends.
- Don't describe the scope as read-only anywhere.

## Data exposure

- Shared caches (Supabase) must check the requesting user can access the repo before
  returning cached data, and must not cache private repositories.
- Logs: status codes and messages, never tokens, keys, cookies or full request bodies.
- Analytics (`outcomes`) store event names and public repo coordinates only.

## Before merging anything security-relevant

Say what the threat is and how the change handles it in the commit message. If a fix
needs a production change (RLS on existing tables, key rotation), stop and ask the owner.
