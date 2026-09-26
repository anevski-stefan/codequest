#!/usr/bin/env node
/**
 * Shell guard for coding agents (Claude Code PreToolUse / Gemini CLI BeforeTool).
 *
 * Reads the hook payload from stdin: { tool_input: { command }, cwd, ... }.
 * Exit 0 = allow, exit 2 = block (stderr is shown to the agent as the reason).
 * Both tools use this contract, so one script serves both.
 *
 * It enforces the repo rules that are too costly to leave to good intentions:
 * secrets never get committed, and destructive git/database commands need a human.
 */
import { execFileSync } from 'node:child_process';

const SECRET_FILE = /(^|\/)(\.env(\.(?!example$)[^/\s]+)?|\.mcp\.json)$/;

/** Heredoc bodies (`<<'EOF' … EOF`) are data written to files or stdin, not commands. */
export function stripHeredocs(cmd) {
  return cmd.replace(/<<-?\s*(['"]?)([A-Za-z_][\w-]*)\1[^\n]*\n[\s\S]*?\n\s*\2(?=\s*$|\s*\n)/gm, '<<HEREDOC');
}

/**
 * Split a command line into simple commands on && || ; | and newlines,
 * ignoring separators inside quotes (multi-line commit messages are common).
 */
export function splitCommands(cmd) {
  const parts = [];
  let cur = '';
  let quote = null;
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (quote) {
      if (c === '\\' && quote === '"' && i + 1 < cmd.length) { cur += c + cmd[++i]; continue; }
      if (c === quote) quote = null;
      cur += c;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; cur += c; continue; }
    const two = cmd.slice(i, i + 2);
    if (two === '&&' || two === '||') { parts.push(cur); cur = ''; i++; continue; }
    if (c === ';' || c === '|' || c === '\n') { parts.push(cur); cur = ''; continue; }
    cur += c;
  }
  parts.push(cur);
  return parts.map(p => p.trim()).filter(Boolean);
}

const tokens = part =>
  part.match(/"(?:\\.|[^"\\])*"|'[^']*'|\S+/g)?.map(t => t.replace(/^['"]|['"]$/g, '')) ?? [];

/**
 * Pure: returns a reason string if the command must be blocked, else null.
 * `stagedFiles` is injected so this stays testable without git.
 */
export function checkCommand(cmd, stagedFiles = () => []) {
  for (const part of splitCommands(stripHeredocs(cmd))) {
    const t = tokens(part);
    const gitAt = t.indexOf('git');
    if (gitAt !== -1) {
      const sub = t[gitAt + 1];
      const args = t.slice(gitAt + 2);

      if (sub === 'add') {
        if (args.some(a => ['-A', '--all', '.', '-u', '--update', '*'].includes(a))) {
          return 'Stage explicit paths only (no `git add -A`, `.`, `-u`). See the git-workflow skill.';
        }
        const secret = args.find(a => SECRET_FILE.test(a));
        if (secret) return `\`${secret}\` must never be committed (secrets / local config).`;
      }

      if (sub === 'commit') {
        if (args.some(a => a === '-a' || a === '--all' || /^-[a-zA-Z]*a[a-zA-Z]*$/.test(a) && !a.startsWith('--'))) {
          return 'Don\'t use `git commit -a`; commit explicit paths with `git commit -m "…" -- <paths>`.';
        }
        const dd = args.indexOf('--');
        const pathspecs = dd === -1 ? [] : args.slice(dd + 1);
        const secretPath = pathspecs.find(p => SECRET_FILE.test(p));
        if (secretPath) return `\`${secretPath}\` must never be committed.`;
        if (pathspecs.length === 0) {
          const staged = stagedFiles().filter(f => SECRET_FILE.test(f));
          if (staged.length) {
            return `Secret/local files are staged (${staged.join(', ')}). Commit with explicit pathspecs: git commit -m "…" -- <your files>`;
          }
        }
      }

      if (sub === 'push' && args.some(a => a === '--force' || a === '-f' || a.startsWith('--force'))) {
        return 'Force-push needs the owner\'s explicit approval.';
      }
      if (sub === 'reset' && args.includes('--hard')) return '`git reset --hard` discards work; ask the owner first.';
      if (sub === 'clean' && args.some(a => /^-[a-zA-Z]*f/.test(a))) return '`git clean -f` deletes untracked files; ask the owner first.';
      if ((sub === 'checkout' || sub === 'restore') && args.includes('.') && !args.includes('--staged')) {
        return 'Discarding all working-tree changes needs the owner\'s approval.';
      }
      if (sub === 'branch' && args.some(a => a === '-D')) return 'Force-deleting a branch needs the owner\'s approval.';
    }

    const sbAt = t.indexOf('supabase');
    if (sbAt !== -1 && t[sbAt + 1] === 'db' && t[sbAt + 2] === 'reset') {
      return '`supabase db reset` wipes the database; ask the owner first.';
    }

    const rmAt = t.indexOf('rm');
    if (rmAt !== -1 && t.slice(rmAt + 1).some(a => /^-[a-zA-Z]*r/.test(a))) {
      const targets = t.slice(rmAt + 1).filter(a => !a.startsWith('-'));
      if (targets.some(a => ['/', '~', '$HOME', '..', '.', '*', '.git'].includes(a) || a.startsWith('/Users/') && a.split('/').length <= 3)) {
        return 'Recursive delete of a root, home, parent or .git path is blocked.';
      }
    }
  }
  return null;
}

function stagedFilesIn(cwd) {
  try {
    return execFileSync('git', ['diff', '--cached', '--name-only'], { cwd, encoding: 'utf8' })
      .split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

async function main() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  let input;
  try { input = JSON.parse(raw || '{}'); } catch { process.exit(0); }
  const cmd = input?.tool_input?.command;
  if (typeof cmd !== 'string' || !cmd.trim()) process.exit(0);

  const reason = checkCommand(cmd, () => stagedFilesIn(input.cwd || process.cwd()));
  if (reason) {
    process.stderr.write(`Blocked by .agents/hooks/guard-shell.mjs: ${reason}\n`);
    process.exit(2);
  }
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
