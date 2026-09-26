// Run: node --test .agents/hooks/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkCommand, readPayload, antigravityResponse } from './guard-shell.mjs';

const blocked = (cmd, staged = []) => checkCommand(cmd, () => staged) !== null;

test('staging everything is blocked; explicit paths are allowed', () => {
  assert.ok(blocked('git add -A'));
  assert.ok(blocked('git add .'));
  assert.ok(blocked('cd frontend && git add --all'));
  assert.ok(!blocked('git add frontend/src/a.ts backend/src/b.js'));
});

test('secret files cannot be added or committed by path', () => {
  assert.ok(blocked('git add backend/.env.prod'));
  assert.ok(blocked('git add .env'));
  assert.ok(blocked('git add .mcp.json'));
  assert.ok(blocked('git commit -m "x" -- .env.local'));
  assert.ok(!blocked('git add frontend/.env.example'));
});

test('a plain commit is blocked while secrets are staged, allowed with pathspecs', () => {
  const staged = ['.mcp.json', 'backend/.env.prod', 'src/a.ts'];
  assert.ok(blocked('git commit -m "feat: x"', staged));
  assert.ok(!blocked('git commit -m "feat: x" -- src/a.ts', staged));
  assert.ok(!blocked('git commit -m "feat: x"', ['src/a.ts']));
});

test('commit -a is blocked', () => {
  assert.ok(blocked('git commit -am "x"'));
  assert.ok(blocked('git commit -a -m "x"'));
  assert.ok(!blocked('git commit --amend --no-edit -- src/a.ts'));
});

test('destructive git commands are blocked', () => {
  assert.ok(blocked('git push --force origin develop'));
  assert.ok(blocked('git push -f'));
  assert.ok(blocked('git reset --hard HEAD~1'));
  assert.ok(blocked('git clean -fd'));
  assert.ok(blocked('git checkout -- .'));
  assert.ok(blocked('git restore .'));
  assert.ok(blocked('git branch -D feature'));
  assert.ok(!blocked('git push origin develop'));
  assert.ok(!blocked('git restore --staged backend/.env.prod'));
  assert.ok(!blocked('git status --short'));
});

test('database reset and dangerous rm are blocked', () => {
  assert.ok(blocked('supabase db reset'));
  assert.ok(!blocked('supabase db push --dry-run'));
  assert.ok(blocked('rm -rf /'));
  assert.ok(blocked('rm -rf ~'));
  assert.ok(blocked('rm -rf .git'));
  assert.ok(!blocked('rm -rf frontend/dist'));
  assert.ok(!blocked('rm test-claim.js'));
});

test('quoted commit messages mentioning dangerous words do not trigger', () => {
  assert.ok(!blocked('git commit -m "docs: explain why git reset --hard is blocked" -- AGENTS.md'));
});

test('multi-line quoted commit messages keep their pathspec', () => {
  const staged = ['.mcp.json', 'src/a.ts'];
  const cmd = 'git add src/a.ts && git commit -q -m "feat: x\n\n- line one; with semicolon\n- a | pipe" -- src/a.ts';
  assert.ok(!blocked(cmd, staged));
  assert.ok(blocked('git commit -m "feat: x\n\nbody"', staged));
});

test('separators outside quotes still split commands', () => {
  assert.ok(blocked('echo "safe" && git reset --hard'));
  assert.ok(blocked('git status; git clean -fd'));
});

test('heredoc bodies are treated as data, not commands', () => {
  const cmd = "python3 - <<'EOF'\nprint('git reset --hard')\ns = 'git commit -m wip'\nEOF\necho done";
  assert.ok(!blocked(cmd, ['.mcp.json']));
  const after = "cat > f.txt <<EOF\nhello\nEOF\ngit reset --hard";
  assert.ok(blocked(after));
});

test('payloads from Claude/Gemini and Antigravity are both understood', () => {
  assert.deepEqual(readPayload({ tool_input: { command: 'ls' }, cwd: '/r' }), { flavor: 'exit-code', command: 'ls', cwd: '/r' });
  assert.deepEqual(
    readPayload({ toolCall: { name: 'run_command', args: { CommandLine: 'git status', Cwd: '/w' } }, workspacePaths: ['/x'] }),
    { flavor: 'antigravity', command: 'git status', cwd: '/w' },
  );
  assert.equal(readPayload({ toolCall: { args: { CommandLine: 'ls' } }, workspacePaths: ['/x'] }).cwd, '/x');
});

test('Antigravity gets a JSON deny, and an empty object (not "allow") otherwise', () => {
  const deny = antigravityResponse('nope');
  assert.equal(deny.decision, 'deny');
  assert.equal(deny.allow_tool, false);
  assert.equal(deny.reason, 'nope');
  assert.deepEqual(antigravityResponse(null), {});
});
