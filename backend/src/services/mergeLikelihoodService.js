const githubService = require('./githubService');
const { getSupabase } = require('../config/supabase');
const logger = require('../utils/logger');
const { isBotAccount } = require('../utils/bots');
const { isValidOwner, isValidRepo } = require('../utils/validateParams');

/**
 * Merge Likelihood: how often, and how fast, a repository merges pull
 * requests from people outside the maintainer team.
 *
 * "Outside" rather than "new": GitHub reports author_association as of now,
 * so a first-timer whose PR got merged shows up as CONTRIBUTOR afterwards.
 * Filtering to first-timers only would keep the rejected ones and drop the
 * merged ones. Everyone who isn't OWNER/MEMBER/COLLABORATOR is counted.
 */

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_SAMPLE = 5;          // below this the rate is noise
const WAITING_AFTER_DAYS = 30; // open this long = effectively ignored
const DAY = 86400000;

const MAINTAINER_ROLES = new Set(['OWNER', 'MEMBER', 'COLLABORATOR']);

const isBot = pr => !!pr.user?.login && isBotAccount(pr.user.login, pr.user.type);

const isOutside = pr => !isBot(pr) && !MAINTAINER_ROLES.has(pr.author_association);

function median(values) {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Pure: turn raw PR lists into the metric.
 * Long-open outside PRs count as not merged, so repos that ignore PRs
 * (instead of closing them) don't look healthy.
 */
function computeMergeStats(closedPrs, openPrs, now = Date.now()) {
  const closed = closedPrs.filter(isOutside);
  const waiting = openPrs.filter(pr => isOutside(pr) && now - Date.parse(pr.created_at) >= WAITING_AFTER_DAYS * DAY);
  const merged = closed.filter(pr => pr.merged_at);

  const sampleSize = closed.length + waiting.length;
  const mergeRate = sampleSize > 0 ? merged.length / sampleSize : null;
  const days = merged.map(pr => (Date.parse(pr.merged_at) - Date.parse(pr.created_at)) / DAY);
  const medianDays = median(days);

  let likelihood = 'unknown';
  if (sampleSize >= MIN_SAMPLE) {
    likelihood = mergeRate >= 0.6 ? 'high' : mergeRate >= 0.35 ? 'medium' : 'low';
  }

  return {
    likelihood,
    merge_rate: mergeRate === null ? null : Math.round(mergeRate * 100),
    median_days_to_merge: medianDays === null ? null : Math.round(medianDays * 10) / 10,
    sample_size: sampleSize,
    merged_count: merged.length,
    waiting_count: waiting.length,
  };
}

async function readCache(owner, repo) {
  const { data, error } = await getSupabase().from('merge_likelihood_cache')
    .select('stats, updated_at').eq('owner', owner).eq('repo', repo).maybeSingle();
  if (error) {
    logger.warn('[mergeLikelihood] cache read failed', { message: error.message });
    return null;
  }
  if (!data || Date.now() - Date.parse(data.updated_at) >= CACHE_TTL_MS) return null;
  return data.stats;
}

async function writeCache(owner, repo, stats) {
  const { error } = await getSupabase().from('merge_likelihood_cache').upsert({
    owner, repo, likelihood: stats.likelihood, stats, updated_at: new Date().toISOString(),
  }, { onConflict: 'owner,repo' });
  if (error) logger.warn('[mergeLikelihood] cache write failed', { message: error.message });
}

async function readCacheBulk(repos) {
  if (!repos.length) return {};
  const { data, error } = await getSupabase().from('merge_likelihood_cache')
    .select('owner, repo, stats, updated_at')
    .in('owner', repos.map(r => r.owner))
    .in('repo', repos.map(r => r.repo));

  if (error) {
    logger.warn('[mergeLikelihood] cache readBulk failed', { message: error.message });
    return {};
  }
  
  const requestedSet = new Set(repos.map(r => `${r.owner.toLowerCase()}/${r.repo.toLowerCase()}`));
  
  const map = {};
  const now = Date.now();
  for (const row of data || []) {
    const key = `${row.owner.toLowerCase()}/${row.repo.toLowerCase()}`;
    if (!requestedSet.has(key)) continue;
    if (now - Date.parse(row.updated_at) < CACHE_TTL_MS) {
      map[`${row.owner}/${row.repo}`.toLowerCase()] = row.stats;
    }
  }
  return map;
}

async function getMergeLikelihood(token, rawOwner, rawRepo) {
  const owner = rawOwner.toLowerCase();
  const repo = rawRepo.toLowerCase();

  // Always confirm this user can see the repo before serving anything,
  // cached or not, so private repo stats never leak by name. This call is
  // served from githubService's own GET cache most of the time.
  const details = await githubService.request(token, 'GET', `/repos/${owner}/${repo}`);

  const cached = await readCache(owner, repo);
  if (cached) return cached;

  const [closedPrs, openPrs] = await Promise.all([
    githubService.request(token, 'GET', `/repos/${owner}/${repo}/pulls`, {
      params: { state: 'closed', per_page: 100, sort: 'updated', direction: 'desc' },
    }),
    githubService.request(token, 'GET', `/repos/${owner}/${repo}/pulls`, {
      params: { state: 'open', per_page: 100, sort: 'created', direction: 'asc' },
    }),
  ]);

  const stats = computeMergeStats(Array.isArray(closedPrs) ? closedPrs : [], Array.isArray(openPrs) ? openPrs : []);
  if (!details?.private) await writeCache(owner, repo, stats);
  return stats;
}

const MAX_BULK_REPOS = 100;

function normalizeBulkRepos(repos) {
  if (!Array.isArray(repos)) return { error: 'repos must be an array of {owner, repo} objects' };
  if (repos.length > MAX_BULK_REPOS) return { error: `Send at most ${MAX_BULK_REPOS} repositories at a time` };
  if (!repos.every(r => r && isValidOwner(r.owner) && isValidRepo(r.repo))) {
    return { error: 'Each repo needs a valid owner and name' };
  }
  const unique = new Map();
  for (const r of repos) {
    const owner = r.owner.toLowerCase();
    const repo = r.repo.toLowerCase();
    unique.set(`${owner}/${repo}`, { owner, repo });
  }
  return { repos: [...unique.values()] };
}

async function getCachedMergeLikelihoodBulk(repos) {
  return readCacheBulk(repos);
}

module.exports = { getMergeLikelihood, getCachedMergeLikelihoodBulk, normalizeBulkRepos, MAX_BULK_REPOS, computeMergeStats, isOutside, median, MIN_SAMPLE };
