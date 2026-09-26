---
name: git-workflow
description: How to stage and commit in the Code Quest repo safely. Use whenever you run git add, git commit, create a branch, write a commit message, or are asked to commit, push or clean up the working tree. Covers pathspec commits, files that must never be committed (.env*, .mcp.json), respecting the owner's staged changes, and commit message format.
metadata:
  project: codequest
  version: "1.0"
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
<type>(<scope>): <what changed, imperative, ≤72 chars>

<why: the problem this solves or the bug it fixes>
- bullet per notable change
- mention anything the reviewer must know (migrations to run, behaviour changes)
```

Types: `feat`, `fix`, `refactor`, `style`, `test`, `docs`, `chore`. Scope is the area
(`claims`, `explore`, `ai`, `db`). Explain *why*, not a file list. If another agent drafted
the code, say so ("Initial implementation drafted with X, reviewed and corrected here").
Follow any attribution-trailer rule your own tool gives you.

## Before committing

Run the gates from `testing-and-verification`. Don't commit known-broken code; if you must
checkpoint, say so in the message.

## Dangerous commands

Don't run `git reset --hard`, `git clean -fd`, `git checkout -- .`, `git push --force`, or
branch deletion without the owner asking explicitly. The guard hook blocks most of them.
