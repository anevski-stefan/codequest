const GitHubService = require('../services/githubService');
const { asyncHandler, sendError } = require('../utils/httpError');

const LABEL_OR = '"good first issue","good-first-issue","help wanted","help-wanted","beginner","first-timers-only","easy","up-for-grabs"';

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

function buildBaseQuery({ language, commentsRange, timeFrame, q: searchKeyword }) {
  let q = `is:issue is:open no:assignee label:${LABEL_OR} `;
  if (searchKeyword) q += `${searchKeyword} `;
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

async function fetchIssues(accessToken, q, page, perPage = 100) {
  const data = await GitHubService.request(accessToken, 'GET', '/search/issues', {
    params: { q, sort: 'created', order: 'desc', per_page: perPage, page },
  });
  return data?.items ? data : { items: [], total_count: 0 };
}

async function enrichWithStars(accessToken, items) {
  if (!items || items.length === 0) return items;

  const uniqueRepos = [...new Set(items.map(item => {
    const parts = (item.repository_url || '').split('/');
    return parts.slice(-2).join('/');
  }).filter(Boolean))];

  if (uniqueRepos.length === 0) return items;

  const queryParts = uniqueRepos.map((fullName, index) => {
    const [owner, name] = fullName.split('/');
    return `repo${index}: repository(owner: "${owner}", name: "${name}") { stargazerCount }`;
  });
  
  const query = `query { ${queryParts.join('\n')} }`;

  let starsMap = {};
  try {
    const result = await GitHubService.request(accessToken, 'POST', '/graphql', {
      data: { query },
      cacheTtlMs: 24 * 60 * 60 * 1000
    });
    
    if (result.data) {
      uniqueRepos.forEach((fullName, index) => {
        const repoData = result.data[`repo${index}`];
        if (repoData) {
          starsMap[fullName] = repoData.stargazerCount;
        }
      });
    }
  } catch (error) {
    console.error('Failed to batch fetch repo stars', error);
  }

  return items.map(item => {
    const parts = (item.repository_url || '').split('/');
    const fn = parts.slice(-2).join('/');
    return { ...item, repoStars: starsMap[fn] ?? 0 };
  });
}

const claimService = require('../services/claimService');
const mergeLikelihoodService = require('../services/mergeLikelihoodService');

async function rankIssues(accessToken, items) {
  if (!items || items.length === 0) return items;

  const uniqueRepos = [...new Set(items.map(item => {
    const parts = (item.repository_url || '').split('/');
    return parts.slice(-2).join('/');
  }).filter(Boolean))];

  const repoObjects = uniqueRepos.map(fn => {
    const [owner, repo] = fn.split('/');
    return { owner, repo };
  });
  
  const [mergeStatsBulk, claims] = await Promise.all([
    mergeLikelihoodService.getCachedMergeLikelihoodBulk(repoObjects),
    claimService.getClaims(accessToken, items.map(item => {
      const parts = (item.repository_url || '').split('/');
      return { owner: parts[parts.length - 2], repo: parts[parts.length - 1], number: item.number };
    }))
  ]);

  for (const item of items) {
    const parts = (item.repository_url || '').split('/');
    const owner = parts[parts.length - 2];
    const repo = parts[parts.length - 1];
    const key = `${owner}/${repo}#${item.number}`.toLowerCase();
    const fullName = `${owner}/${repo}`.toLowerCase();

    const claim = claims[key] || { status: 'unknown' };
    item._claim = claim;
    
    const mStats = mergeStatsBulk[fullName];
    item._mergeLikelihood = mStats ? mStats.likelihood : 'unknown';

    let score = 0;
    if (claim.status === 'free') score += 10;
    else if (claim.status === 'stale') score += 5;
    else score -= 100;
    
    if (item._mergeLikelihood === 'high') score += 5;
    else if (item._mergeLikelihood === 'medium') score += 2;
    else if (item._mergeLikelihood === 'low') score -= 5;
    
    item._fitScore = score;
  }

  return items.sort((a, b) => {
    if (b._fitScore !== a._fitScore) return b._fitScore - a._fitScore;
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

exports.getSuggestedIssues = asyncHandler(async (req, res) => {
  const {
    commentsRange = '',
    timeFrame = 'month',
    page = 1,
    famousOnly = 'false',
    q = '',
  } = req.query;

  let { language = '' } = req.query;

  if (!language) {
    const topLangs = await GitHubService.getUserTopLanguages(req.user.accessToken);
    if (topLangs.length > 0) {
      language = topLangs[0];
    }
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const base = buildBaseQuery({ language, commentsRange, timeFrame, q });

  const perPage = 30;

  if (famousOnly === 'true') {
    const qA = `${base} ${FAMOUS_ORGS_A.map(o => `org:${o}`).join(' ')}`;
    const qB = `${base} ${FAMOUS_ORGS_B.map(o => `org:${o}`).join(' ')}`;

    const [resA, resB] = await Promise.all([
      fetchIssues(req.user.accessToken, qA, pageNum, perPage),
      fetchIssues(req.user.accessToken, qB, pageNum, perPage),
    ]);

    const seen = new Set();
    const merged = [...resA.items, ...resB.items]
      .filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const totalCount = resA.total_count + resB.total_count;
    const pagedItems = merged.slice(0, perPage);
    const hasMore = (pageNum * perPage) < totalCount;

    let enriched = await enrichWithStars(req.user.accessToken, pagedItems);
    enriched = await rankIssues(req.user.accessToken, enriched);
    return res.json({ items: enriched, total_count: totalCount, hasMore, currentPage: pageNum, personalizedLang: language });
  }

  const data = await fetchIssues(req.user.accessToken, base, pageNum, perPage);
  if (!data.items.length && !data.total_count) return sendError(res, 502, 'No data received from GitHub');

  let enriched = await enrichWithStars(req.user.accessToken, data.items);
  enriched = await rankIssues(req.user.accessToken, enriched);

  res.json({
    items: enriched,
    total_count: data.total_count,
    hasMore: data.total_count > pageNum * perPage,
    currentPage: pageNum,
    personalizedLang: language,
  });
});
