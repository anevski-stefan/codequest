const GitHubService = require('./githubService');
const logger = require('../utils/logger');

/**
 * Claim Detector: answers "is anyone already working on this issue?"
 *
 * Statuses
 *   free         nobody has claimed it
 *   requested    someone asked to take it recently, no PR yet
 *   in_progress  an open pull request will close it, or it was assigned recently
 *   stale        claimed/assigned/PR'd a while ago with no movement since: an opening
 *   closed       the issue is closed
 */

const DAY = 86400000;
const REQUEST_FRESH_DAYS = 21;   // "can I take this?" older than this is stale
const ASSIGN_FRESH_DAYS = 30;    // assignment with no PR after this is stale
const PR_STALE_DAYS = 30;        // open PR untouched for this long is stale
const BATCH_SIZE = 25;           // issues per GraphQL request (keeps query cost low)
const CACHE_TTL_MS = 20 * 60 * 1000;

// Comment phrasings people use to claim an issue. Kept deliberately narrow:
// a false "requested" is worse than a missed one.
const CLAIM_PATTERNS = [
  /\bi(?:'d| would)\s+(?:like|love)\s+to\s+(?:work|take|pick|tackle|handle|give\s+it)/i,
  /\b(?:can|could|may)\s+i\s+(?:work\s+on|take|pick\s+(?:this|it)\s+up|tackle|be\s+assigned|get\s+assigned|have\s+(?:this|it))/i,
  /\bassign\s+(?:this|it)?\s*to\s+me\b/i,
  /^\s*\/assign\b/im,
  /\bi(?:'ll| will)\s+(?:take|work\s+on|pick\s+up)\s+(?:this|it)\b/i,
  /\bi(?:'m| am)\s+(?:working|currently\s+working)\s+on\s+(?:this|it)\b/i,
  /\blet\s+me\s+(?:take|work\s+on)\s+(?:this|it)\b/i,
  /\bi\s+want\s+to\s+work\s+on\s+(?:this|it)\b/i,
];

const isBot = login => !login || /\[bot\]$|-bot$|^dependabot|^github-actions/i.test(login);

const isClaimComment = body => CLAIM_PATTERNS.some(re => re.test(body || ''));

const daysBetween = (a, b) => Math.floor((b - a) / DAY);

const ISSUE_FIELDS = `
  state
  assignees(first: 3) { nodes { login } }
  timelineItems(last: 40, itemTypes: [CROSS_REFERENCED_EVENT, CONNECTED_EVENT, ASSIGNED_EVENT, ISSUE_COMMENT]) {
    nodes {
      __typename
      ... on CrossReferencedEvent {
        createdAt
        willCloseTarget
        source { __typename ... on PullRequest { number url state isDraft updatedAt author { login } } }
      }
      ... on ConnectedEvent {
        createdAt
        subject { __typename ... on PullRequest { number url state isDraft updatedAt author { login } } }
      }
      ... on AssignedEvent { createdAt assignee { __typename ... on User { login } } }
      ... on IssueComment { createdAt body author { login } }
    }
  }`;

/** Builds one aliased GraphQL query for a batch; all user input goes through variables. */
function buildClaimsQuery(issues) {
  const defs = [];
  const parts = [];
  const variables = {};
  issues.forEach((it, i) => {
    defs.push(`$o${i}: String!`, `$r${i}: String!`, `$n${i}: Int!`);
    variables[`o${i}`] = it.owner;
    variables[`r${i}`] = it.repo;
    variables[`n${i}`] = it.number;
    parts.push(`i${i}: repository(owner: $o${i}, name: $r${i}) { issue(number: $n${i}) { ${ISSUE_FIELDS} } }`);
  });
  return { query: `query(${defs.join(', ')}) { ${parts.join('\n')} }`, variables };
}

/** Pure: classify one issue node from the GraphQL response. */
function classifyClaim(issue, now = Date.now()) {
  if (!issue) return { status: 'unknown', reason: 'Could not read this issue' };
  if (issue.state === 'CLOSED') return { status: 'closed', reason: 'This issue is closed' };

  const items = issue.timelineItems?.nodes ?? [];

  // Linked pull requests (a PR that will close it, or one manually connected).
  const prs = [];
  for (const node of items) {
    const pr = node.__typename === 'CrossReferencedEvent' && node.willCloseTarget ? node.source
      : node.__typename === 'ConnectedEvent' ? node.subject
      : null;
    if (pr && pr.__typename === 'PullRequest' && !prs.some(p => p.number === pr.number)) prs.push(pr);
  }
  const openPr = prs.filter(p => p.state === 'OPEN').sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
  if (openPr) {
    const idle = daysBetween(Date.parse(openPr.updatedAt), now);
    const who = openPr.author?.login;
    const pr = { number: openPr.number, url: openPr.url, author: who, draft: !!openPr.isDraft };
    if (idle >= PR_STALE_DAYS) {
      return { status: 'stale', since: openPr.updatedAt, pr, claimant: who,
        reason: `PR #${openPr.number}${who ? ` by ${who}` : ''} has been idle for ${idle} days` };
    }
    return { status: 'in_progress', since: openPr.updatedAt, pr, claimant: who,
      reason: `${openPr.isDraft ? 'Draft PR' : 'PR'} #${openPr.number} is open${who ? ` by ${who}` : ''}` };
  }

  // Assignment.
  const assignee = issue.assignees?.nodes?.[0]?.login;
  if (assignee) {
    const assignedEvent = [...items].reverse().find(n => n.__typename === 'AssignedEvent' && n.assignee?.login === assignee);
    const at = assignedEvent ? Date.parse(assignedEvent.createdAt) : null;
    const age = at ? daysBetween(at, now) : null;
    if (age !== null && age >= ASSIGN_FRESH_DAYS) {
      return { status: 'stale', since: assignedEvent.createdAt, claimant: assignee,
        reason: `Assigned to ${assignee} ${age} days ago, no pull request yet` };
    }
    return { status: 'in_progress', since: assignedEvent?.createdAt ?? null, claimant: assignee,
      reason: `Assigned to ${assignee}${age !== null ? ` ${age === 0 ? 'today' : `${age} day${age === 1 ? '' : 's'} ago`}` : ''}` };
  }

  // "Can I take this?" comments.
  const claim = [...items].reverse().find(n =>
    n.__typename === 'IssueComment' && !isBot(n.author?.login) && isClaimComment(n.body));
  if (claim) {
    const age = daysBetween(Date.parse(claim.createdAt), now);
    const who = claim.author?.login;
    if (age >= REQUEST_FRESH_DAYS) {
      return { status: 'stale', since: claim.createdAt, claimant: who,
        reason: `${who ?? 'Someone'} asked to take it ${age} days ago, nothing since` };
    }
    return { status: 'requested', since: claim.createdAt, claimant: who,
      reason: `${who ?? 'Someone'} asked to take it ${age === 0 ? 'today' : `${age} day${age === 1 ? '' : 's'} ago`}` };
  }

  return { status: 'free', reason: 'Nobody has claimed this issue' };
}

const keyOf = it => `${it.owner}/${it.repo}#${it.number}`.toLowerCase();
const cache = new Map();

async function fetchBatch(token, batch) {
  const { query, variables } = buildClaimsQuery(batch);
  const res = await GitHubService.request(token, 'POST', '/graphql', {
    data: { query, variables },
    maxRetries: 1,
    timeout: 20000,
  });
  // GraphQL returns partial data with `errors` for inaccessible repos; classify what came back.
  if (res?.errors?.length) logger.warn('[claims] partial GraphQL errors', { count: res.errors.length });
  return batch.map((it, i) => [keyOf(it), classifyClaim(res?.data?.[`i${i}`]?.issue)]);
}

/** Returns { "owner/repo#n": claim } for the given issues, using a short-lived cache. */
async function getClaims(token, issues) {
  const now = Date.now();
  const out = {};
  const missing = [];
  for (const it of issues) {
    const hit = cache.get(keyOf(it));
    if (hit && hit.expires > now) out[keyOf(it)] = hit.claim;
    else missing.push(it);
  }
  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const entries = await fetchBatch(token, missing.slice(i, i + BATCH_SIZE));
    for (const [key, claim] of entries) {
      out[key] = claim;
      if (claim.status !== 'unknown') cache.set(key, { claim, expires: now + CACHE_TTL_MS });
    }
  }
  if (cache.size > 20000) {
    for (const [k, v] of cache) if (v.expires <= now) cache.delete(k);
  }
  return out;
}

module.exports = { buildClaimsQuery, classifyClaim, isClaimComment, getClaims, keyOf, BATCH_SIZE };
