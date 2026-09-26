@AGENTS.md

## Claude Code specifics

- Skills: `.claude/skills/` symlinks to `.agents/skills/` (one source for every agent).
- Subagents: `code-reviewer` (read-only review) and `ui-verifier` (mock-mode browser check)
  in `.claude/agents/`.
- Hooks: `.claude/settings.json` runs `.agents/hooks/guard-shell.mjs` before every Bash
  command; if it blocks you, fix the command rather than working around it.
