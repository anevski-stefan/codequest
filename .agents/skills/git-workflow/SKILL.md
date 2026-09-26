---
name: git-workflow
description: How to stage and commit in the Code Quest repo safely. Use whenever you run git add, git commit, create a branch, write a commit message, or are asked to commit, push or clean up the working tree. Covers pathspec commits, files that must never be committed (.env*, .mcp.json), respecting the owner's staged changes, and the Conventional Commits message format (subject only, no body, no attribution trailers).
metadata:
  project: codequest
  version: "1.1"
---

# Git workflow

Work happens on `develop`; `master` is the release branch. Commit when asked or when a
task says to; **never push** unless the owner asks.

## Never commit

- `.env`, `.env.*` (except `.env.example`), `backend/.env.prod`
- `.mcp.json` (local tool config)
- Scratch files: `test-*.js` in the root, screenshots, `dist/`, logs

The owner sometimes has these **staged**. A plain `git commit` would include them.

## Commit by pathspec

```bash
git status --short                 # see what's staged by the owner vs changed by you
git add path/to/new-file.ts        # only new files you created
git commit -m "…" -- path/a path/b # --only semantics: commits exactly these paths
```

- Never `git add -A`, `git add .`, `git commit -a`.
- `git commit -- <paths>` also includes the owner's staged edits **to those same files**.
  If you touched a file the owner had staged, mention it in your report.
- The shell guard hook (`.agents/hooks/guard-shell.mjs`) blocks a commit while a secret
  file is staged unless you pass explicit pathspecs.

## Message format

```
<type>(<scope>): <imperative summary>
```

**A subject line and nothing else.** No body, no bullet list, no `Co-Authored-By` trailer,
no "Generated with". Attribution is not recorded in this repo — 0 of 358 commits on `master`
carry it, and a commit message is not the place to credit a tool or another agent.

Types, in the order of real use on `master`:

| Type | Use for |
|---|---|
| `fix` | a bug or a wrong result |
| `refactor` | behaviour-neutral restructuring |
| `chore` | deps, build, config, migrations, CI plumbing |
| `feat` | a capability that did not exist |
| `perf` | a measured speed or size win |
| `docs` | docs, `AGENTS.md`, skills |
| `style` | formatting only |
| `ci` | workflow changes |

Scope is the **feature area, not a file path** — the history uses `claims`, `explore`, `ai`,
`hackathons`, `browse`, `agents`, `db`, `ui`, `settings`, `feedback`, `lint`. Drop it when the
prefix alone is enough.

- Lowercase after the prefix, no trailing period. That is 214 of 220 and 0 exceptions.
- No hard length cap. Subjects here run to 130 characters; keep it near 72 when you can.
- Say what changed and, when it fits in the line, why. Never a file list.
- The one exception: a change spanning several concerns may carry a body of `-` bullets that
  explain *why* each part exists. 8 commits in the history do this and they are the ones worth
  reading. Never use a body to restate the subject.
- Never create an empty merge commit. Three `Merge branch 'develop'` commits in the history
  carry no message and exist only to reconcile branches.

## Before committing

Run the gates from `testing-and-verification`. Don't commit known-broken code; if you must
checkpoint, say so in the message.

## Dangerous commands

Don't run `git reset --hard`, `git clean -fd`, `git checkout -- .`, `git push --force`, or
branch deletion without the owner asking explicitly. The guard hook blocks most of them.
