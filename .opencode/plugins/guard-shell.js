// OpenCode plugin: runs the shared shell guard (.agents/hooks/guard-shell.mjs) before
// every bash call. OpenCode blocks a tool call when the hook throws.
import { execFileSync } from 'node:child_process';
import { checkCommand } from '../../.agents/hooks/guard-shell.mjs';

const stagedFiles = cwd => {
  try {
    return execFileSync('git', ['diff', '--cached', '--name-only'], { cwd, encoding: 'utf8' })
      .split('\n').filter(Boolean);
  } catch {
    return [];
  }
};

export const GuardShell = async ({ directory, worktree }) => ({
  'tool.execute.before': async (input, output) => {
    if (input.tool !== 'bash') return;
    const command = output?.args?.command;
    if (typeof command !== 'string' || !command.trim()) return;
    const cwd = output.args.workdir || worktree || directory;
    const reason = checkCommand(command, () => stagedFiles(cwd));
    if (reason) throw new Error(`Blocked by .agents/hooks/guard-shell.mjs: ${reason}`);
  },
});
