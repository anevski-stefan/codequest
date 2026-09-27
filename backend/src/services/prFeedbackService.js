const githubService = require('./githubService');
const logger = require('../utils/logger');
const { isBotAccount } = require('../utils/bots');

const FAILED_CHECK_CONCLUSIONS = new Set(['failure', 'timed_out', 'startup_failure', 'action_required']);
const FAILED_STATUS_STATES = new Set(['failure', 'error']);
const OPINIONATED_STATES = new Set(['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED']);
const MAX_ITEM_BODY_CHARS = 2000;
const MAX_CHECKS_FOR_AI = 3;
const MAX_ANNOTATIONS = 20;
const MAX_LOG_BYTES = 5 * 1024 * 1024;
const LOG_TAIL_CHARS = 3000;
const LOG_ERROR_LINES = 30;
const LOG_ERROR_PATTERN = /\b(error|failed|failure|exception|assert(ion)?|traceback|panic|fatal)\b|✕|✖/i;
const ACTIONS_APP_SLUG = 'github-actions';
const PAGE_SIZE = 100;
const MAX_PAGES = 5;

const isBot = user => !user || isBotAccount(user.login, user.type);

function pickFailedChecks(checkRuns = [], statuses = []) {
  const failed = [];
  for (const run of checkRuns) {
    if (!FAILED_CHECK_CONCLUSIONS.has(run?.conclusion)) continue;
    failed.push({
      id: run.id,
      kind: 'check',
      name: run.name,
      url: run.html_url ?? run.details_url ?? null,
      isActions: run.app?.slug === ACTIONS_APP_SLUG,
    });
  }
  const seenContexts = new Set();
  for (const status of statuses) {
    if (!status?.context || seenContexts.has(status.context)) continue;
    seenContexts.add(status.context);
    if (!FAILED_STATUS_STATES.has(status.state)) continue;
    failed.push({
      id: status.id,
      kind: 'status',
      name: status.context,
      url: status.target_url ?? null,
      description: status.description ?? null,
      isActions: false,
    });
  }
  return failed;
}

function buildReviewChecklist(reviews = [], comments = []) {
  const byReviewer = new Map();
  const sorted = [...reviews]
    .filter(r => r?.user && !isBot(r.user) && r.submitted_at)
    .sort((a, b) => Date.parse(a.submitted_at) - Date.parse(b.submitted_at));

  for (const review of sorted) {
    const login = review.user.login;
    const entry = byReviewer.get(login) ?? { stance: null, since: 0, reviewIds: new Set(), bodies: [] };
    if (OPINIONATED_STATES.has(review.state)) {
      if (review.state !== 'CHANGES_REQUESTED') {
        entry.since = Date.parse(review.submitted_at);
        entry.reviewIds = new Set();
        entry.bodies = [];
      }
      entry.stance = review.state;
    }
    if (Date.parse(review.submitted_at) >= entry.since && review.state !== 'APPROVED' && review.state !== 'DISMISSED') {
      entry.reviewIds.add(review.id);
      if (typeof review.body === 'string' && review.body.trim()) {
        entry.bodies.push(review);
      }
    }
    byReviewer.set(login, entry);
  }

  const requesters = [...byReviewer.entries()].filter(([, e]) => e.stance === 'CHANGES_REQUESTED');
  const openReviewIds = new Set(requesters.flatMap(([, e]) => [...e.reviewIds]));
  const items = [];

  for (const [login, entry] of requesters) {
    for (const review of entry.bodies) {
      items.push({
        id: `review-${review.id}`,
        author: login,
        body: review.body.trim().slice(0, MAX_ITEM_BODY_CHARS),
        path: null,
        line: null,
        outdated: false,
        url: review.html_url ?? null,
        createdAt: review.submitted_at,
      });
    }
  }

  for (const comment of comments) {
    if (!comment || comment.in_reply_to_id || isBot(comment.user)) continue;
    if (!openReviewIds.has(comment.pull_request_review_id)) continue;
    if (typeof comment.body !== 'string' || !comment.body.trim()) continue;
    items.push({
      id: `comment-${comment.id}`,
      author: comment.user.login,
      body: comment.body.trim().slice(0, MAX_ITEM_BODY_CHARS),
      path: comment.path ?? null,
      line: comment.line ?? comment.original_line ?? null,
      outdated: comment.line == null,
      url: comment.html_url ?? null,
      createdAt: comment.created_at,
    });
  }

  items.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  return { requestedBy: requesters.map(([login]) => login), items };
}

const ANSI = /\x1b\[[0-9;]*[A-Za-z]/g;
const TIMESTAMP_PREFIX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z\s?/;

function extractLogExcerpt(rawLog) {
  if (typeof rawLog !== 'string' || !rawLog) return '';
  const lines = rawLog.replace(ANSI, '').split(/\r?\n/).map(l => l.replace(TIMESTAMP_PREFIX, ''));
  const errorLines = lines.filter(l => LOG_ERROR_PATTERN.test(l)).slice(-LOG_ERROR_LINES);
  const tail = lines.join('\n').slice(-LOG_TAIL_CHARS);
  return [
    errorLines.length ? `Lines that mention errors:\n${errorLines.join('\n')}` : null,
    `End of the log:\n${tail}`,
  ].filter(Boolean).join('\n\n');
}

async function fetchPull(token, owner, repo, number) {
  return githubService.request(token, 'GET', `/repos/${owner}/${repo}/pulls/${number}`, { cacheTtlMs: 60 * 1000 });
}

async function fetchFailedChecks(token, owner, repo, sha) {
  const [runs, combined] = await Promise.all([
    githubService.request(token, 'GET', `/repos/${owner}/${repo}/commits/${sha}/check-runs`, {
      params: { per_page: 100, filter: 'latest' },
      cacheTtlMs: 60 * 1000,
    }),
    githubService.request(token, 'GET', `/repos/${owner}/${repo}/commits/${sha}/status`, {
      params: { per_page: 100 },
      cacheTtlMs: 60 * 1000,
    }),
  ]);
  return pickFailedChecks(runs?.check_runs ?? [], combined?.statuses ?? []);
}

async function fetchAllPages(token, path) {
  const all = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = await githubService.request(token, 'GET', path, {
      params: { per_page: PAGE_SIZE, page },
      cacheTtlMs: 60 * 1000,
    });
    if (!Array.isArray(batch)) break;
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return all;
}

async function getPullFeedback(token, owner, repo, number) {
  const pull = await fetchPull(token, owner, repo, number);
  const sha = pull?.head?.sha;
  const [failedChecks, reviews, comments] = await Promise.all([
    sha ? fetchFailedChecks(token, owner, repo, sha) : [],
    fetchAllPages(token, `/repos/${owner}/${repo}/pulls/${number}/reviews`),
    fetchAllPages(token, `/repos/${owner}/${repo}/pulls/${number}/comments`),
  ]);
  return {
    headSha: sha ?? null,
    failedChecks: failedChecks.map(({ isActions, ...check }) => check),
    review: buildReviewChecklist(reviews ?? [], comments ?? []),
  };
}

async function fetchCheckEvidence(token, owner, repo, check) {
  if (check.kind === 'status') {
    return { name: check.name, text: check.description ? `Status description: ${check.description}` : '' };
  }
  const parts = [];
  try {
    const annotations = await githubService.request(token, 'GET', `/repos/${owner}/${repo}/check-runs/${check.id}/annotations`, {
      params: { per_page: MAX_ANNOTATIONS },
    });
    const lines = (annotations ?? [])
      .filter(a => a?.annotation_level === 'failure' || a?.annotation_level === 'warning')
      .map(a => `${a.path}:${a.start_line} ${a.annotation_level}: ${(a.message ?? '').slice(0, 400)}`);
    if (lines.length) parts.push(`Annotations:\n${lines.join('\n')}`);
  } catch (err) {
    logger.warn('[prFeedback] annotations read failed', { message: err.message });
  }
  if (check.isActions) {
    try {
      const log = await githubService.request(token, 'GET', `/repos/${owner}/${repo}/actions/jobs/${check.id}/logs`, {
        cache: false,
        maxRetries: 0,
        maxContentLength: MAX_LOG_BYTES,
        responseType: 'text',
      });
      const excerpt = extractLogExcerpt(typeof log === 'string' ? log : '');
      if (excerpt) parts.push(excerpt);
    } catch (err) {
      const tooLarge = /maxContentLength/i.test(err.originalError?.message ?? '');
      if (tooLarge) parts.push(`The job log is larger than ${MAX_LOG_BYTES / (1024 * 1024)} MB and could not be read.`);
      logger.warn('[prFeedback] job log read failed', { message: err.message });
    }
  }
  return { name: check.name, text: parts.join('\n\n') };
}

async function getCiEvidence(token, owner, repo, failedChecks) {
  return Promise.all(failedChecks.slice(0, MAX_CHECKS_FOR_AI).map(check => fetchCheckEvidence(token, owner, repo, check)));
}

module.exports = {
  pickFailedChecks,
  buildReviewChecklist,
  extractLogExcerpt,
  getPull: fetchPull,
  getFailedChecks: fetchFailedChecks,
  getPullFeedback,
  getCiEvidence,
};
