## Gemini CLI and Antigravity (agy) specifics

`AGENTS.md` is loaded alongside this file (see `.gemini/settings.json`).

- Skills are in `.agents/skills/`. Call `activate_skill` for every skill whose trigger in
  the AGENTS.md table matches the task, **before** editing files. Activating a skill is
  cheap; guessing conventions is not.
- Subagents in `.gemini/agents/`: delegate reviews to `code-reviewer` and UI checks to
  `ui-verifier`.
- A `BeforeTool` hook runs `.agents/hooks/guard-shell.mjs` on shell commands and blocks
  secret commits and destructive git/database commands. Don't bypass it.

Antigravity (`agy` and the IDE) reads the same `AGENTS.md`, this file and
`.agents/skills/`, but has its own locations for the rest:

- Subagents: `.agents/agents/code-reviewer.md`, `.agents/agents/ui-verifier.md`
  (`subagent: true`; tools `view_file`, `grep_search`, `run_command`).
- Hooks: `.agents/hooks.json` runs the same guard on `run_command`. Antigravity expects a
  JSON decision on stdout rather than exit code 2; the script detects this automatically.
