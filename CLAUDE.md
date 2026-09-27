@AGENTS.md

## Claude Code specifics

- Skills: `.claude/skills/` symlinks to `.agents/skills/` (one source for every agent).
- Subagents in `.claude/agents/`: `code-reviewer` (gates and defects), `change-critic`
  (scope, fit, simplicity; run both in parallel before a commit) and `ui-verifier`
  (mock-mode browser check).
- Hooks: `.claude/settings.json` runs `.agents/hooks/guard-shell.mjs` before every Bash
  command; if it blocks you, fix the command rather than working around it.
