#!/usr/bin/env node
/**
 * Validates the shared agent setup so a broken skill or config fails CI instead of
 * silently degrading every coding agent. Run from the repo root:
 *   node .agents/scripts/validate-agents.mjs
 *
 * Checks
 *  - every .agents/skills/<name>/SKILL.md follows the Agent Skills spec
 *    (name = folder, lowercase-hyphen, description 1–1024 chars, ≤ 500 lines,
 *    referenced files exist)
 *  - .claude/skills has exactly one working symlink per skill
 *  - tool configs parse as JSON
 *  - every subagent file has a name/description
 *  - no secret or local-only file is tracked by git
 */
import { readFileSync, readdirSync, existsSync, lstatSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const errors = [];
const fail = msg => errors.push(msg);

const frontmatter = text => {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  const field = key => (m[1].match(new RegExp(`^${key}:\\s*(.+)$`, 'm')) || [])[1]?.trim();
  return { field };
};

// Skills
const SKILLS_DIR = '.agents/skills';
const skills = existsSync(SKILLS_DIR) ? readdirSync(SKILLS_DIR).filter(d => !d.startsWith('.')) : [];
if (skills.length === 0) fail(`${SKILLS_DIR}: no skills found`);
for (const name of skills) {
  const file = join(SKILLS_DIR, name, 'SKILL.md');
  if (!existsSync(file)) { fail(`${file}: missing`); continue; }
  const text = readFileSync(file, 'utf8');
  const fm = frontmatter(text);
  if (!fm) { fail(`${file}: missing YAML frontmatter`); continue; }
  const skillName = fm.field('name');
  const description = fm.field('description') ?? '';
  if (skillName !== name) fail(`${file}: name "${skillName}" must equal folder "${name}"`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(skillName ?? '') || (skillName ?? '').length > 64) {
    fail(`${file}: name must be 1–64 chars, lowercase letters, digits and single hyphens`);
  }
  if (!description || description.length > 1024) fail(`${file}: description must be 1–1024 chars (is ${description.length})`);
  const lines = text.split('\n').length;
  if (lines > 500) fail(`${file}: ${lines} lines, keep SKILL.md under 500`);
  for (const [, ref] of text.matchAll(/\]\(((?:references|scripts|assets)\/[^)#]+)\)/g)) {
    if (!existsSync(join(SKILLS_DIR, name, ref))) fail(`${file}: links to missing ${ref}`);
  }
}

// Claude symlinks
const CLAUDE_SKILLS = '.claude/skills';
if (existsSync(CLAUDE_SKILLS)) {
  const links = readdirSync(CLAUDE_SKILLS).filter(d => !d.startsWith('.'));
  for (const name of skills) {
    const link = join(CLAUDE_SKILLS, name);
    if (!existsSync(link)) { fail(`${link}: missing symlink to ${SKILLS_DIR}/${name}`); continue; }
    if (!lstatSync(link).isSymbolicLink()) fail(`${link}: must be a symlink, not a copy`);
    else if (realpathSync(link) !== realpathSync(join(SKILLS_DIR, name))) fail(`${link}: points somewhere else`);
  }
  for (const extra of links.filter(l => !skills.includes(l))) fail(`${CLAUDE_SKILLS}/${extra}: no matching skill in ${SKILLS_DIR}`);
}

// JSON configs
for (const file of ['.claude/settings.json', '.gemini/settings.json', '.agents/hooks.json', 'opencode.json']) {
  if (!existsSync(file)) continue;
  try { JSON.parse(readFileSync(file, 'utf8')); } catch (e) { fail(`${file}: invalid JSON (${e.message})`); }
}

// Subagents
for (const dir of ['.claude/agents', '.gemini/agents', '.agents/agents', '.opencode/agents']) {
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter(f => f.endsWith('.md'))) {
    const fm = frontmatter(readFileSync(join(dir, f), 'utf8'));
    if (!fm || !fm.field('description')) fail(`${dir}/${f}: frontmatter needs a description`);
    if (dir !== '.opencode/agents' && !fm?.field('name')) fail(`${dir}/${f}: frontmatter needs a name`);
  }
}

// Hook script referenced by every tool
if (!existsSync('.agents/hooks/guard-shell.mjs')) fail('.agents/hooks/guard-shell.mjs: missing');

// Secrets must never be tracked
const SECRET = /(^|\/)(\.env(\.(?!example$)[^/]+)?|\.mcp\.json)$/;
let tracked = [];
try { tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').filter(Boolean); } catch { /* not a git checkout */ }
for (const f of tracked.filter(f => SECRET.test(f))) fail(`${f}: secret/local file is tracked by git; remove it with git rm --cached`);

if (errors.length) {
  console.error(`Agent setup validation failed (${errors.length}):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`Agent setup OK: ${skills.length} skills, symlinks, configs, subagents, no tracked secrets.`);
