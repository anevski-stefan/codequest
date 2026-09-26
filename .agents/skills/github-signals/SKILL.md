---
name: github-signals
description: Correctly fetching GitHub data and deriving signals from it in Code Quest - claim status, merge likelihood, lottery factor, contributor stats, search and rate limits. Use when writing GitHub REST or GraphQL calls, computing any metric or badge from GitHub data, batching requests, or interpreting author_association, bots, timelines and PR states.
metadata:
  project: codequest
  version: "1.0"
---

# GitHub signals

Signals are the product. A number that looks precise but measures the wrong thing is
worse than no number: users make decisions on it. Every metric must be explainable in one
sentence that is literally true.

## Fetching

- Use `githubService.request(req.user.accessToken, …)`; never raw axios.
- **Rate limits:** 5,000 REST requests/hour per token; search 30/min; code search 10/min;
  GraphQL uses a point budget. Batch, cache, and compute on demand — never loop over
  hundreds of REST calls per page view.
- **GraphQL:** one query with aliases per batch (≈25 items), and **all user input in
  variables** (`$o0: String!` etc.), never interpolated. GraphQL returns HTTP 200 with
  `errors` and partial `data`: handle both; mark unreadable items `unknown`, not "free".
- REST lists are capped (`per_page=100`); say "recent" when you only looked at 100 items.

## Interpreting data (lessons learned — don't repeat them)

- **Bots:** exclude `user.type === 'Bot'` and logins matching
  `/\[bot\]$|-bot$|^dependabot|^renovate/i` from anything about humans.
- **`author_association` is reported as of now**, not as of the PR. A first-timer whose PR
  was merged later shows as `CONTRIBUTOR`. So "new contributors only" can't be computed
  from this field; use "outside contributors" = not `OWNER|MEMBER|COLLABORATOR`.
- **Survivorship:** closed-only samples hide PRs that are ignored forever. Count
  long-open PRs (30+ days) as not merged.
- **Small samples:** below ~5 data points, show "not enough data", never a tier.
- **Medians over means** for durations; one 400-day PR must not move the headline.
- **Linked PRs:** only `CrossReferencedEvent.willCloseTarget === true` or `ConnectedEvent`
  mean "this PR fixes the issue"; a mention is not a claim. Merged/closed PRs don't block.
- **Claims in comments:** narrow regexes ("can I work on this", "/assign"); a false
  "taken" is worse than a missed one. Ignore bot comments.
- **Scraped third-party data** (hackathons) can be wrong: prefer the most reliable field
  (end date) and don't display fields you know are broken.

## Presenting a signal

- Show the evidence next to the verdict: "18 of 28 recent outside PRs merged, usually
  within 5 days", not just "High".
- Every status has a reason string the UI can show (`claim.reason`).
- Keep the pure calculation separate and unit-tested (`classifyClaim`,
  `computeMergeStats`), with a test for each pitfall above.

## Existing implementations to copy

| Signal | Service | Endpoint |
|---|---|---|
| Claim status (free/requested/in progress/stale) | `services/claimService.js` | `POST /api/issues/claims` |
| Merge likelihood | `services/mergeLikelihoodService.js` | `GET /api/repos/:o/:r/merge-likelihood` |
| Lottery factor | `controllers/reposController.js` | `GET /api/repos/:o/:r/lottery-contributors` |
