## Gemini CLI specifics

`AGENTS.md` is loaded alongside this file (see `.gemini/settings.json`).

- Skills are in `.agents/skills/`. Call `activate_skill` for every skill whose trigger in
  the AGENTS.md table matches the task, **before** editing files. Activating a skill is
  cheap; guessing conventions is not.
- Subagents in `.gemini/agents/`: delegate reviews to `code-reviewer` and UI checks to
  `ui-verifier`.
- A `BeforeTool` hook runs `.agents/hooks/guard-shell.mjs` on shell commands and blocks
  secret commits and destructive git/database commands. Don't bypass it.
