---
name: product-and-copy
description: Code Quest product direction, feature prioritisation and writing rules for UI text, empty states, error messages and reports to the owner. Use when deciding what to build next, scoping a feature, proposing ideas, writing any user-facing text, or summarising work for the owner.
metadata:
  project: codequest
  version: "1.0"
---

# Product and copy

## Positioning

Code Quest guides a developer **from issue to merged PR**. Discovery alone is a commodity
(goodfirstissue.dev, GitHub's `/contribute`). What users can't get elsewhere:

1. **Is someone already on this issue?** → Claim Detector (built)
2. **Will this repo review my PR, and how fast?** → Merge Likelihood (built)
3. **What exactly do I change?** → AI breakdown, repo onboarding (built)
4. **My PR is open — now what?** → PR follow-up (CI failures, review requests, silence)
5. **How does this help my career?** → verified portfolio of merged PRs

## Prioritising

Prefer work that:

- moves a user one step closer to a merged PR,
- reuses what exists (notifications UI, `outcomes` table, claim/merge signals),
- produces data we can't get later (outcome events: start collecting early),
- doesn't need a paid key or GitHub App until the owner decides on budget.

Park: maintainer-side features, browser extension, semantic search — until there are
users and a budget.

When proposing work: recommend one thing, say why it beats the alternatives, give a rough
size, and name any decision the owner must make (budget, production DB change).

## UI copy

- Sentence case, short, concrete. Say what happened and what to do next.
- Empty states: why it's empty + the next action. Errors: cause + recovery (Retry, link).
- Show evidence next to verdicts ("18 of 28 recent outside PRs merged").
- No filler words (seamless, elevate, unleash, next-gen), no exclamation marks, no emojis.
- **No unverified claims.** Don't advertise "read-only access" (scope is `public_repo`),
  "updated hourly", or numbers you didn't measure. If unsure, remove the claim.

## Protected areas

- `/login` (landing page) is approved as is. Don't change it unless asked. Shared
  components it uses (e.g. `FeedbackModal`) may change; mention it.

## Reporting to the owner

- Answer in the owner's language (often Macedonian). Keep code identifiers in English.
- Lead with the outcome, then what they need to do (migrations, env, restarts).
- List what you verified and what you did not. Mention anything of theirs you touched
  (staged files, running processes).
