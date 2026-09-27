#!/usr/bin/env node
/**
 * Antigravity PreInvocation hook: long sessions push AGENTS.md out of the model's
 * attention, so a short ephemeral reminder is injected before every model call.
 */
import { pathToFileURL } from 'node:url';

export const REMINDER = [
  'Code Quest rules (AGENTS.md) still apply:',
  'activate the matching skills before editing;',
  'a fix must not make anything else worse;',
  'verify before done: gates, and for UI the widths and states in ui-verification;',
  'before any commit: code-reviewer + change-critic, then commit only your files by pathspec;',
  'never commit secrets; answer the owner in their language.',
].join(' ');

export function reminderResponse() {
  return { injectSteps: [{ ephemeralMessage: REMINDER }] };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(JSON.stringify(reminderResponse()));
}
