const GitHubService = require('../services/githubService');
const { asyncHandler, sendError } = require('../utils/httpError');

// Comma-separated label values = OR in GitHub search
const LABEL_OR = '"good first issue","good-first-issue","help wanted","help-wanted","beginner","first-timers-only","easy","up-for-grabs"';

// 30 well-known orgs, split into two batches so each query stays under GitHub's length limit
const FAMOUS_ORGS_A = [
  'microsoft', 'google', 'facebook', 'meta', 'vercel',
  'vuejs', 'sveltejs', 'angular', 'tailwindlabs', 'vitejs',
  'nodejs', 'denoland', 'expressjs', 'fastify', 'nestjs',
];
const FAMOUS_ORGS_B = [
  'rust-lang', 'python', 'golang', 'django', 'rails',
  'kubernetes', 'docker', 'grafana', 'elastic', 'supabase',
  'prisma', 'storybookjs', 'mozilla', 'huggingface', 'langchain-ai',
];

// In-process star count cache
const starsCache = new Map();
const starsInflight = new Map();
const STARS_TTL = 60 * 60 * 1000;

async function getRepoStars(accessToken, fullName) {
  const now = Date.now();
  const cached = starsCache.get(fullName);
  if (cached && now - cached.ts < STARS_TTL) return cached.stars;

  if (starsInflight.has(fullName)) return starsInflight.get(fullName);

  const promise = GitHubService.request(accessToken, 'GET', `/repos/${fullName}`)
    .then(data => {
      const stars = data?.stargazers_count ?? 0;
      for (const [key, val] of starsCache) {
        if (Date.now() - val.ts >= STARS_TTL) starsCache.delete(key);
      }
      starsCache.set(fullName, { stars, ts: Date.now() });
      return stars;
    })
    .catch(() => 0)
    .finally(() => starsInflight.delete(fullName));

  starsInflight.set(fullName, promise);
  return promise;
}

function buildBaseQuery({ language, commentsRange, timeFrame }) {
  let q = `is:issue is:open no:assignee label:${LABEL_OR} `;
  if (language) q += `language:${language} `;
  if (commentsRange === '0') q += 'comments:0 ';
  else if (commentsRange === '1-5') q += 'comments:1..5 ';
  else if (commentsRange === '6-10') q += 'comments:6..10 ';
  if (timeFrame && timeFrame !== 'all') {
    const since = new Date();
    if (timeFrame === 'week') since.setDate(since.getDate() - 7);
    else if (timeFrame === 'month') since.setMonth(since.getMonth() - 1);
    else if (timeFrame === 'year') since.setFullYear(since.getFullYear() - 1);
    q += `created:>=${since.toISOString().slice(0, 10)} `;
  }
  return q.trim();
}

async function fetchIssues(accessToken, q, page) {
  const data = await GitHubService.request(accessToken, 'GET', '/search/issues', {
    params: { q, sort: 'created', order: 'desc', per_page: 100, page },
  });
  return data?.items ? data : { items: [], total_count: 0 };
}

async function enrichWithStars(accessToken, items) {
  const uniqueRepos = [...new Set(items.map(item => {
    const parts = (item.repository_url || '').split('/');
    return parts.slice(-2).join('/');
  }).filter(Boolean))];

  const starsMap = {};
  await Promise.allSettled(uniqueRepos.map(async fn => {
    starsMap[fn] = await getRepoStars(accessToken, fn);
  }));

  return items.map(item => {
    const parts = (item.repository_url || '').split('/');
    const fn = parts.slice(-2).join('/');
    return { ...item, repoStars: starsMap[fn] ?? 0 };
  });
}

exports.getSuggestedIssues = asyncHandler(async (req, res) => {
  const {
    language = '',
    commentsRange = '',
    timeFrame = 'month',
    page = 1,
    famousOnly = 'false',
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const base = buildBaseQuery({ language, commentsRange, timeFrame });

  let allItems;
  let totalCount;

  if (famousOnly === 'true') {
    // Two parallel queries across the 30 famous orgs
    const qA = `${base} ${FAMOUS_ORGS_A.map(o => `org:${o}`).join(' ')}`;
    const qB = `${base} ${FAMOUS_ORGS_B.map(o => `org:${o}`).join(' ')}`;

    const [resA, resB] = await Promise.all([
      fetchIssues(req.user.accessToken, qA, 1),
      fetchIssues(req.user.accessToken, qB, 1),
    ]);

    // Merge, dedup by id, sort newest first
    const seen = new Set();
    const merged = [...resA.items, ...resB.items]
      .filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    totalCount = resA.total_count + resB.total_count;

    // Paginate the merged pool client-side (30 per page)
    const perPage = 30;
    const start = (pageNum - 1) * perPage;
    allItems = merged.slice(start, start + perPage);
    const hasMore = merged.length > start + perPage;

    const enriched = await enrichWithStars(req.user.accessToken, allItems);
    return res.json({ items: enriched, total_count: totalCount, hasMore, currentPage: pageNum });
  }

  // Non-famous mode: single query
  const data = await fetchIssues(req.user.accessToken, base, pageNum);
  if (!data.items.length && !data.total_count) return sendError(res, 502, 'No data received from GitHub');

  const enriched = await enrichWithStars(req.user.accessToken, data.items);

  res.json({
    items: enriched,
    total_count: data.total_count,
    hasMore: data.total_count > pageNum * 100,
    currentPage: pageNum,
  });
});
