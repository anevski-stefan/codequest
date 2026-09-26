---
name: code-review
description: Reviewing a diff in Code Quest - your own before committing, a teammate's, or code written by another AI agent (Gemini, Codex, Cursor). Use when asked to review, check, or "see if this is ok", before merging, or after another agent made changes. Gives the order of checks, the project-specific failure patterns seen before, and the report format.
metadata:
  project: codequest
  version: "1.0"
---

# Code review

Goal: find what is **wrong for users or data**, not restyle working code. Rank findings by
impact. Verify claims against the code before reporting them.

## Order of work

1. `git status --short`, `git diff`, `git diff --cached`, list untracked files. Read every
   changed file fully, not just the hunks.
2. Run the gates (`testing-and-verification`). A clean build is necessary, not sufficient.
3. Check behaviour against intent: what was this supposed to do, does it do that?
4. Walk the checklist below.
5. Report (format at the end). Offer to fix; don't silently rewrite.

## Checklist

**Correctness of meaning**
- Does every metric measure what its label says? (bots, maintainers, survivorship, small
  samples, mean vs median — see `github-signals`)
- Are events/analytics recorded once, at the moment that matters (on submit, not on
  draft; once per item, not per re-render or refetch)?
- Effects keyed on object identity (`[issueProp]`) fire again on every refetch — key on ids.

**Input and security** (`security`)
- Every client value validated and bounded on the backend; enums whitelisted.
- GraphQL/SQL/prompt input passed as data, never interpolated.
- Caches never serve private data to users without access.
- Nothing posts to GitHub or sends email without an explicit user action.

**Failure modes**
- `{ error }` checked on Supabase calls; network failures shown in the UI with retry,
  not swallowed into "nothing renders".
- Fire-and-forget calls can't break the main action.

**Consistency**
- Reuses existing components/services instead of duplicating (`frontend-ui`, `backend-api`).
- Design rules: no violet/purple, no emojis, tokens not raw colours.
- New endpoint → mock route; new table → migration with RLS; new logic → test.

**Hygiene**
- No stray files (`test-*.js`, scratch scripts, screenshots), no debug `console.log`,
  no dead imports, no dynamic `import()` of a module that is already imported statically.
- Migrations: safe to re-run, RLS on, not editing an already-applied file.

## Report format

```
Verdict: <ship / fix first / needs rework> — one sentence why.
Checks run: <tsc/eslint/build/tests and results>

Must fix
1. <file:line> — what is wrong → concrete consequence → suggested fix
Should fix
…
Minor
…
Not verified: <what you could not check and why>
```

Lead with the problems that affect users or data. If it's good, say so plainly.
