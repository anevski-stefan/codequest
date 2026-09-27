const githubService = require('./githubService');
const { getSupabase } = require('../config/supabase');
const { getCachedMergeLikelihoodBulk } = require('./mergeLikelihoodService');
const { OUTCOME_EVENTS, recordOutcome } = require('./outcomeService');
const logger = require('../utils/logger');
const { isBotAccount } = require('../utils/bots');

const SYNC_COOLDOWN_MS = 5 * 60 * 1000;
const SILENCE_FLOOR_DAYS = 14;
const SILENCE_ABANDONED_DAYS = 90;
const SILENCE_BASELINE_FACTOR = 2;
const MERGED_WINDOW_DAYS = 30;
const FAILED_CHECK_CONCLUSIONS = new Set(['FAILURE', 'TIMED_OUT', 'STARTUP_FAILURE', 'ACTION_REQUIRED']);
const FAILED_STATUS_STATES = new Set(['FAILURE', 'ERROR']);
const ATTRIBUTED_EVENTS = ['pr_opened', 'pr_merged'];
const MAX_NAMED_CHECKS = 3;
const UNIQUE_VIOLATION = '23505';

const DAY_MS = 24 * 60 * 60 * 1000;
const daysBetween = (now, then) => (now - new Date(then).getTime()) / DAY_MS;

function silenceThresholdDays(medianDaysToMerge) {
  if (!Number.isFinite(medianDaysToMerge) || medianDaysToMerge <= 0) return SILENCE_FLOOR_DAYS;
  return Math.max(SILENCE_FLOOR_DAYS, Math.ceil(SILENCE_BASELINE_FACTOR * medianDaysToMerge));
}

const isBotAuthor = author => !author || isBotAccount(author.login, author.__typename);

const latestChangesRequestAt = reviewNodes => {
  let latest = null;
  for (const review of reviewNodes ?? []) {
    if (review?.state !== 'CHANGES_REQUESTED' || isBotAuthor(review.author)) continue;
    const at = review.submittedAt ?? '';
    if (latest === null || at > latest) latest = at;
  }
  return latest;
};

const linkedIssueNumbers = pr => {
  const own = (pr.repository?.nameWithOwner ?? '').toLowerCase();
  return [...new Set(
    (pr.closingIssuesReferences?.nodes ?? [])
      .filter(node => (node?.repository?.nameWithOwner ?? '').toLowerCase() === own)
      .map(node => node.number)
      .filter(n => Number.isInteger(n) && n > 0),
  )];
};

const failedCheckNames = rollup => {
  const names = [];
  for (const node of rollup?.contexts?.nodes ?? []) {
    const failed = node?.__typename === 'StatusContext'
      ? FAILED_STATUS_STATES.has(node.state)
      : FAILED_CHECK_CONCLUSIONS.has(node?.conclusion);
    const name = node?.__typename === 'StatusContext' ? node.context : node?.name;
    if (failed && typeof name === 'string' && name && !names.includes(name)) names.push(name);
  }
  return names;
};

const describeFailedChecks = names => {
  if (names.length === 0) return '';
  const shown = names.slice(0, MAX_NAMED_CHECKS).join(', ');
  const rest = names.length - MAX_NAMED_CHECKS;
  return rest > 0 ? ` (failing: ${shown} and ${rest} more)` : ` (failing: ${shown})`;
};

const splitNameWithOwner = pr => {
  const [owner, repo] = (pr.repository?.nameWithOwner ?? '').split('/');
  return owner && repo ? { owner, repo } : null;
};

const isOwnRepo = (owner, viewerLogin) => !!viewerLogin && owner.toLowerCase() === viewerLogin.toLowerCase();

const issueKey = (owner, repo, issueNumber) => `${owner.toLowerCase()}/${repo.toLowerCase()}#${issueNumber}`;

const panelLink = (owner, repo, { prNumber, issueNumber }) => (issueNumber
  ? `/explore/${owner}/${repo}?issue=${issueNumber}`
  : `/explore/${owner}/${repo}?pr=${prNumber}`);

function planOpenPRNotifications(openPRs, { now, seen, medianDaysByRepo, viewerLogin }) {
  const planned = [];
  const add = item => { if (!seen.has(item.key)) planned.push(item); };
  for (const pr of openPRs) {
    const parts = splitNameWithOwner(pr);
    if (!parts || isOwnRepo(parts.owner, viewerLogin)) continue;
    const { owner, repo } = parts;
    const nameWithOwner = `${owner}/${repo}`;
    const prLink = panelLink(owner, repo, { prNumber: pr.number });
    const headOid = pr.headRefOid?.oid ?? 'unknown';

    const rollup = pr.commits?.nodes?.[0]?.commit?.statusCheckRollup;
    const ciFailed = rollup?.state === 'FAILURE' || rollup?.state === 'ERROR';
    const requestAt = latestChangesRequestAt(pr.latestOpinionatedReviews?.nodes);
    const conflicting = pr.mergeable === 'CONFLICTING';

    if (ciFailed) {
      add({
        key: `pr_ci_failed:${pr.url}:${headOid}`,
        type: 'pr_ci_failed',
        title: 'CI failed on your PR',
        message: `"${pr.title}" in ${nameWithOwner}${describeFailedChecks(failedCheckNames(rollup))}`,
        link: prLink,
      });
    }

    if (requestAt !== null) {
      add({
        key: `pr_changes_requested:${pr.url}:${requestAt}`,
        type: 'pr_changes_requested',
        title: 'Changes requested on your PR',
        message: `"${pr.title}" in ${nameWithOwner}`,
        link: prLink,
      });
    }

    if (conflicting) {
      add({
        key: `pr_conflict:${pr.url}:${headOid}`,
        type: 'pr_conflict',
        title: 'Your PR has merge conflicts',
        message: `"${pr.title}" in ${nameWithOwner} can't be merged until the conflicts with the base branch are resolved`,
        link: prLink,
      });
    }

    const headCommittedAt = pr.commits?.nodes?.[0]?.commit?.committedDate ?? '';
    const requestStillOpen = requestAt !== null && requestAt > headCommittedAt;
    const waitingOnUser = ciFailed || requestStillOpen || conflicting;
    const threshold = silenceThresholdDays(medianDaysByRepo.get(nameWithOwner.toLowerCase()));
    const idleDays = daysBetween(now, pr.updatedAt);
    if (!pr.isDraft && !waitingOnUser && idleDays >= threshold && idleDays < SILENCE_ABANDONED_DAYS) {
      add({
        key: `pr_silence:${pr.url}:${headOid}`,
        type: 'pr_silence',
        title: 'No activity on your PR',
        message: `"${pr.title}" in ${nameWithOwner} has had no activity for ${Math.floor(idleDays)} days`,
        link: panelLink(owner, repo, { prNumber: pr.number, issueNumber: linkedIssueNumbers(pr)[0] }),
      });
    }
  }
  return planned;
}

function planMergedPRNotifications(mergedPRs, { now, seen, viewerLogin, trackingSince }) {
  const planned = [];
  for (const pr of mergedPRs) {
    if (!pr.mergedAt || daysBetween(now, pr.mergedAt) > MERGED_WINDOW_DAYS) continue;
    const parts = splitNameWithOwner(pr);
    if (!parts || isOwnRepo(parts.owner, viewerLogin)) continue;
    const key = `pr_merged:${pr.url}`;
    if (seen.has(key)) continue;
    planned.push({
      key,
      type: 'pr_merged',
      title: 'Your PR was merged',
      message: `"${pr.title}" in ${parts.owner}/${parts.repo}`,
      link: panelLink(parts.owner, parts.repo, { prNumber: pr.number, issueNumber: linkedIssueNumbers(pr)[0] }),
      read: Number.isFinite(trackingSince) && Date.parse(pr.mergedAt) < trackingSince,
    });
  }
  return planned;
}

function planNotifications({
  openPRs = [],
  mergedPRs = [],
  now = Date.now(),
  seen = new Set(),
  medianDaysByRepo = new Map(),
  viewerLogin = null,
  trackingSince = null,
}) {
  return [
    ...planOpenPRNotifications(openPRs, { now, seen, medianDaysByRepo, viewerLogin }),
    ...planMergedPRNotifications(mergedPRs, { now, seen, viewerLogin, trackingSince }),
  ];
}

function planAttributedOutcomes({ openPRs = [], mergedPRs = [], interactions = new Map(), recorded = {}, viewerLogin = null }) {
  const planned = [];
  const planKeys = new Set();
  const push = (eventType, parts, issueNumber) => {
    const key = `${eventType}:${issueKey(parts.owner, parts.repo, issueNumber)}`;
    if (recorded[eventType]?.has(issueKey(parts.owner, parts.repo, issueNumber)) || planKeys.has(key)) return;
    planKeys.add(key);
    planned.push({ eventType, owner: parts.owner, repo: parts.repo, issueNumber });
  };
  for (const pr of [...openPRs, ...mergedPRs]) {
    const parts = splitNameWithOwner(pr);
    const createdAt = Date.parse(pr.createdAt ?? '');
    if (!parts || !Number.isFinite(createdAt)) continue;
    if (pr.repository?.isPrivate !== false || isOwnRepo(parts.owner, viewerLogin)) continue;
    const issueNumber = linkedIssueNumbers(pr).find(n => {
      const firstTouch = interactions.get(issueKey(parts.owner, parts.repo, n));
      return firstTouch !== undefined && firstTouch < createdAt;
    });
    if (!issueNumber) continue;
    push('pr_opened', parts, issueNumber);
    if (pr.mergedAt) push('pr_merged', parts, issueNumber);
  }
  return planned;
}

const buildOutcomeKeys = rows => {
  const interactions = new Map();
  const recorded = Object.fromEntries(ATTRIBUTED_EVENTS.map(e => [e, new Set()]));
  for (const row of rows ?? []) {
    if (!row.owner || !row.repo || !Number.isInteger(row.issue_number)) continue;
    const key = issueKey(row.owner, row.repo, row.issue_number);
    if (recorded[row.event_type]) {
      recorded[row.event_type].add(key);
      continue;
    }
    const at = Date.parse(row.created_at ?? '');
    if (!OUTCOME_EVENTS.has(row.event_type) || !Number.isFinite(at)) continue;
    if (!interactions.has(key) || at < interactions.get(key)) interactions.set(key, at);
  }
  return { interactions, recorded };
};

const toNotificationRow = (userId, planned) => ({
  user_id: String(userId),
  type: planned.type,
  title: planned.title,
  message: planned.message,
  link: planned.link,
  dedup_key: planned.key,
  is_read: planned.read === true,
});

const buildSeenKeys = rows => {
  const seen = new Set();
  for (const row of rows ?? []) {
    if (row.dedup_key) seen.add(row.dedup_key);
  }
  return seen;
};

const PULL_REQUEST_FIELDS = `
  title
  url
  isDraft
  mergeable
  createdAt
  updatedAt
  headRefOid { oid }
  repository { nameWithOwner isPrivate }
  closingIssuesReferences(first: 5) { nodes { number repository { nameWithOwner } } }
  commits(last: 1) {
    nodes {
      commit {
        committedDate
        statusCheckRollup {
          state
          contexts(first: 25) {
            nodes {
              __typename
              ... on CheckRun { name conclusion }
              ... on StatusContext { context state }
            }
          }
        }
      }
    }
  }
  latestOpinionatedReviews(first: 20) { nodes { state submittedAt author { login __typename } } }
`;

async function fetchPullRequests(token) {
  const query = `
    query {
      me: viewer { login }
      open: viewer {
        pullRequests(first: 30, states: [OPEN], orderBy: { field: UPDATED_AT, direction: DESC }) {
          nodes { number ${PULL_REQUEST_FIELDS} }
        }
      }
      merged: viewer {
        pullRequests(first: 30, states: [MERGED], orderBy: { field: UPDATED_AT, direction: DESC }) {
          nodes { number mergedAt ${PULL_REQUEST_FIELDS} }
        }
      }
    }
  `;
  const result = await githubService.request(token, 'POST', '/graphql', {
    data: { query },
    cacheTtlMs: SYNC_COOLDOWN_MS,
  });
  if (result?.errors?.length) logger.warn('[pr-tracker] partial GraphQL errors', { count: result.errors.length });
  return {
    viewerLogin: result.data?.me?.login ?? null,
    openPRs: result.data?.open?.pullRequests?.nodes ?? [],
    mergedPRs: result.data?.merged?.pullRequests?.nodes ?? [],
  };
}

async function getSeenKeys(supabase, userId, keys) {
  if (keys.length === 0) return new Set();
  const { data, error } = await supabase
    .from('notifications')
    .select('dedup_key')
    .eq('user_id', String(userId))
    .in('dedup_key', keys);
  if (error) logger.warn('[pr-tracker] seen keys read failed', { message: error.message });
  return buildSeenKeys(data);
}

async function getTrackingSince(supabase, userId) {
  const { data, error } = await supabase
    .from('users')
    .select('created_at')
    .eq('id', String(userId))
    .maybeSingle();
  if (error) logger.warn('[pr-tracker] user read failed', { message: error.message });
  const at = Date.parse(data?.created_at ?? '');
  return Number.isFinite(at) ? at : null;
}

const attributionCandidates = prs => {
  const repos = new Set();
  const issueNumbers = new Set();
  for (const pr of prs) {
    const parts = splitNameWithOwner(pr);
    const numbers = linkedIssueNumbers(pr);
    if (!parts || numbers.length === 0) continue;
    repos.add(parts.repo.toLowerCase());
    numbers.forEach(n => issueNumbers.add(n));
  }
  return { repos: [...repos], issueNumbers: [...issueNumbers] };
};

async function getOutcomeKeys(supabase, userId, prs) {
  const { repos, issueNumbers } = attributionCandidates(prs);
  if (issueNumbers.length === 0) return buildOutcomeKeys([]);
  const { data, error } = await supabase
    .from('outcomes')
    .select('event_type, owner, repo, issue_number, created_at')
    .eq('user_id', String(userId))
    .in('repo', repos)
    .in('issue_number', issueNumbers);
  if (error) {
    logger.warn('[pr-tracker] outcomes read failed', { message: error.message });
    return null;
  }
  return buildOutcomeKeys(data);
}

async function getMedianDaysByRepo(repos) {
  const parsed = [...new Map(
    repos
      .filter(Boolean)
      .map(nameWithOwner => nameWithOwner.toLowerCase().split('/'))
      .filter(([owner, repo]) => owner && repo)
      .map(([owner, repo]) => [`${owner}/${repo}`, { owner, repo }]),
  ).values()];
  if (parsed.length === 0) return new Map();
  const byName = await getCachedMergeLikelihoodBulk(parsed);
  const map = new Map();
  for (const [key, stats] of Object.entries(byName)) {
    const median = Number(stats?.median_days_to_merge);
    if (Number.isFinite(median) && median > 0) map.set(key, median);
  }
  return map;
}

async function insertNotification(supabase, userId, planned) {
  const { error } = await supabase.from('notifications').insert([toNotificationRow(userId, planned)]);
  if (!error) return true;
  if (error.code === UNIQUE_VIOLATION) return false;
  logger.warn('[pr-tracker] notification insert failed', { message: error.message });
  return false;
}

const inFlight = new Set();

exports.sync = async (userId, token) => {
  const lockKey = String(userId);
  if (inFlight.has(lockKey)) return;
  inFlight.add(lockKey);
  const supabase = getSupabase();

  try {
    const { viewerLogin, openPRs, mergedPRs } = await fetchPullRequests(token);
    const [medianDaysByRepo, outcomeKeys, trackingSince] = await Promise.all([
      getMedianDaysByRepo(openPRs.map(pr => pr.repository?.nameWithOwner)),
      getOutcomeKeys(supabase, userId, [...openPRs, ...mergedPRs]),
      getTrackingSince(supabase, userId),
    ]);

    const candidates = planNotifications({ openPRs, mergedPRs, now: Date.now(), medianDaysByRepo, viewerLogin, trackingSince });
    const seen = await getSeenKeys(supabase, userId, candidates.map(item => item.key));
    const planned = candidates.filter(item => !seen.has(item.key));
    for (const item of planned) {
      await insertNotification(supabase, userId, item);
    }

    if (outcomeKeys) {
      for (const outcome of planAttributedOutcomes({ openPRs, mergedPRs, viewerLogin, ...outcomeKeys })) {
        await recordOutcome(supabase, { userId, ...outcome }, { serverOnly: true });
      }
    }
  } catch (err) {
    logger.warn('[pr-tracker] sync error', { message: err.message });
  } finally {
    inFlight.delete(lockKey);
  }
};

exports.planNotifications = planNotifications;
exports.toNotificationRow = toNotificationRow;
exports.buildSeenKeys = buildSeenKeys;
exports.silenceThresholdDays = silenceThresholdDays;
exports.planAttributedOutcomes = planAttributedOutcomes;
exports.buildOutcomeKeys = buildOutcomeKeys;
