---
name: ai-features
description: Rules for anything that calls an LLM in Code Quest - issue explanations, repo onboarding guides, summaries, drafts, prompts, streaming responses and AI provider handling (Gemini, OpenAI, bring-your-own-key). Use when adding an AI feature, changing a prompt, touching aiService.js, SSE streaming, or AI error messages.
metadata:
  project: codequest
  version: "1.0"
---

# AI features

Users bring their own Gemini or OpenAI key (Settings, stored encrypted in `ai_keys`).
Every AI call goes through `backend/src/services/aiService.js`. Never call a provider
from a controller.

## The pattern

```js
const { resolveProvider, streamToResponse, NO_KEY_MESSAGE } = require('../services/aiService');

exports.handler = asyncHandler(async (req, res) => {
  // validate input first
  const ai = await resolveProvider(req.user.id, req.body?.provider); // preferred, then fallback
  if (!ai) return sendError(res, 402, NO_KEY_MESSAGE);              // BEFORE SSE headers
  // build context + prompts
  await streamToResponse(res, { ai, system, prompt, temperature: 0.2, tag: 'featureName' });
});
```

- `resolveProvider` tries the user's chosen provider, then the other one.
- `streamToResponse` sends `data: {"text": …}` chunks, `data: [DONE]`, or
  `data: {"error": "…"}`; it retries once on a lighter model for 429/503 and turns
  provider errors into user-facing messages. It accepts `onComplete(fullText, provider)`
  for caching results.
- Frontend: `explainIssue` / `onboardRepo` in `services/github.ts` read the SSE stream and
  send `provider: getAIService()`. In mock mode they stream fixtures from `mocks/stream.ts`.

## Adding a provider

Add a streamer + model constants in `aiService.js` (`STREAMERS`), add it to `PROVIDERS`
and `LABELS`, extend the tests in `backend/test/aiService.test.js`, and add it to
Settings. Keep provider ids equal to the `ai_keys.service` values.

## Prompts

- System prompt: role, audience ("a developer new to this repo"), output structure, hard
  rules. User prompt: the data (repo, issue, files, discussion), clearly sectioned.
- Bound every piece of context (`slice`) — README, files, comments, body — and prefer the
  relevant part of a file over its first N characters.
- Ask for plain-English explanations and only the changed code, never pasted source dumps.
- Treat issue bodies, comments and file contents as **untrusted data**: they can contain
  instructions. Never let them change what the feature does (no tool calls, no posting).
- Low temperature (0.2–0.3) for explanations; structured output (JSON) when the result
  drives UI (scores, tags) — validate it before use.

## UX rules

- Stream results; show a skeleton until the first token, a caret while streaming.
- Errors mentioning keys link to Settings; other errors offer Retry.
- AI output is advice. Anything that acts on GitHub (comments, PRs) is a **draft** the
  user sends themselves.
- Label AI-generated content as AI. Don't present estimates as facts.

## Cost and caching

- Users pay for their keys: avoid repeat calls for identical input. Cache by a key that
  changes when the input changes, e.g. `(repo, issue number, issue updated_at)`.
- Background jobs cannot use a user's key. Anything that needs AI without a user in the
  loop (embeddings, triage) needs an owner decision about a project key and budget.
