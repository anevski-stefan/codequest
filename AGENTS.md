# Code Quest — agent instructions

Shared by every coding agent (Claude Code, Gemini CLI, Antigravity/agy, OpenCode, Codex,
Cursor). Claude loads it through `CLAUDE.md`; Gemini through `.gemini/settings.json`
(`context.fileName`); Antigravity, OpenCode and Codex read it natively.
Area rules live in `frontend/AGENTS.md` and `backend/AGENTS.md` (OpenCode loads them via
`opencode.json`). Subagents and the shell guard are wired per tool: `.claude/`,
`.gemini/`, `.agents/agents` + `.agents/hooks.json` (Antigravity), `.opencode/`.

## What we are building

Code Quest takes a developer from "I want to contribute" to a **merged pull request**.
Finding issues is table stakes; the value is answering the questions that make newcomers
quit: *Is anyone already on this issue? Will this repo review my PR? What exactly do I
change? What happens after I open the PR?* Features that don't serve that path are low
priority. Details: `.agents/skills/product-and-copy/SKILL.md`.

## Stack and layout

| Area | Tech | Path |
|---|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind 3, TanStack Query, Redux Toolkit, Framer Motion, lucide-react | `frontend/src` |
| Backend | Node 22, Express, Passport (GitHub OAuth), axios + axios-cache-interceptor | `backend/src` (`routes → controllers → services`) |
| Data | Supabase Postgres (service key, backend only) | `backend/supabase/migrations` |
| AI | Bring-your-own-key Gemini / OpenAI via `backend/src/services/aiService.js` | |

## Commands

```bash
# frontend (from frontend/)
npm run dev            # Vite on :5173
npx tsc --noEmit -p .  # typecheck
npx eslint src         # lint (one known warning in ThemeContext.tsx)
npm run build          # tsc + vite build

# backend (from backend/)
npm run dev            # nodemon on :3000
npm test               # node:test, test/**/*.test.js

# agent setup (from the repo root)
node .agents/scripts/validate-agents.mjs    # skills, configs, subagents, tracked secrets
node --test .agents/hooks/guard-shell.test.mjs

# database (from backend/, project is linked)
supabase migration list
supabase db push --dry-run && supabase db push
```

CI (`.github/workflows/ci.yml`) runs all of the checks above except the database on every
push and pull request. A red build means a step in the definition of done was skipped.

Mock mode: `VITE_USE_MOCK_DATA=true` in `frontend/.env` runs the whole UI on fixtures
(no backend, no GitHub rate limits). Always set it back to `false` when you finish.

## Skills — activate before you start

Skills live in `.agents/skills/` (Gemini, Antigravity and Codex read it directly;
Claude sees them via `.claude/skills/` symlinks). They are not
optional reading. **Before starting a task, activate every skill whose trigger matches.**
Most tasks match several.

| When the task involves… | Activate |
|---|---|
| Any UI: components, pages, styling, layout, motion, copy on screen | `frontend-ui` |
| Checking a UI change works (always after UI work) | `ui-verification` |
| Express routes, controllers, services, validation, errors, caching | `backend-api` |
| Explain / onboarding / any LLM call, prompts, streaming | `ai-features` |
| GitHub API calls, GraphQL, metrics derived from GitHub data | `github-signals` |
| Supabase tables, migrations, RLS | `supabase-migrations` |
| Writing or running tests, deciding what to verify | `testing-and-verification` |
| Fixing any bug (find the root cause, test that fails first) | `testing-and-verification` + `code-review` |
| Adding an endpoint the frontend calls, or fixtures | `mock-data` |
| Staging, committing, branches | `git-workflow` |
| Reviewing a diff (yours, a teammate's, another agent's) | `code-review` |
| Auth, secrets, user input, private data, anything sent to GitHub | `security` |
| Deciding what to build, product copy, feature scope | `product-and-copy` |

## Non-negotiables

These apply even if no skill is active.

1. **Never commit secrets.** `.env*` (except `.env.example`), `backend/.env.prod` and
   `.mcp.json` stay out of commits. Commit with explicit pathspecs; never `git add -A`.
   A hook blocks the common mistakes (`.agents/hooks/guard-shell.mjs`).
2. **Never act on GitHub for the user without an explicit click.** Draft comments, don't
   post them. No auto-starring, no auto-commenting.
3. **Validate every input on the backend**; user text reaches GitHub GraphQL only through
   variables, never string interpolation.
4. **No unverified claims** in UI copy or in reports to the user. If you didn't run it,
   say so. If a number is an estimate, label it.
5. **Design system is fixed**: Dim/Slate surfaces, one blue accent, no violet/purple/indigo,
   Plus Jakarta Sans, no emojis anywhere. See `frontend-ui`.
6. **Don't change `/login`** (the landing page) without the owner asking.
7. **Every change is verified** before you call it done: typecheck, lint, build, tests, and
   for UI a browser check. Report exactly what you ran and what you didn't.
8. **Leave the workspace as you found it**: mock flag back to `false`, dev servers and
   browsers you started stopped, no scratch files (`test-*.js`) in the repo root.

## Definition of done

- [ ] Relevant skills were activated and followed; your report names them
- [ ] `tsc`, `eslint`, `npm run build` pass (frontend); `npm test` passes (backend)
- [ ] New pure logic has `node:test` coverage (backend) or is extracted so it could.
      Tests call the real function; no copied logic, no mocked globals
- [ ] Bug fixes: root cause named, and the test was shown to fail with the fix reverted
- [ ] You ran the `code-review` checklist on your own diff before reporting
- [ ] UI checked at 1440px and 390px, loading / empty / error states included
- [ ] New endpoints have a mock route and validation
- [ ] Committed by pathspec with a message that explains *why*
- [ ] Final report lists what changed, what was verified, and what was not

## Communicating with the owner

- The owner often writes in Macedonian; answer in the language they used.
- Be concise and direct. Lead with the result, then what they need to do.
- When something could not be verified (no browser, no credentials), say it plainly and
  give the exact command or step to verify it themselves.
