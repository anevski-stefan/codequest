import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { AxiosError } from 'axios';
import {
  ME, REPOS, ISSUES, ASSIGNED_OPEN, ASSIGNED_CLOSED, STARRED, USER_REPOS, SEARCH_USERS, HACKATHONS,
  NOTIFICATIONS, findRepo, commentsFor, topContributorsFor, lotteryFor, confidenceFor, pullsFor,
  pullDetails, activityFor, userProfile, avatar, daysAgo, makeIssue, type MockIssue,
} from './data';

/**
 * Axios adapter that answers every backend route from fixtures.
 * Enabled with VITE_USE_MOCK_DATA=true; see src/mocks/index.ts.
 */

// Mutable state so actions (star, mark read, comment, save key) stick for the session.
const state = {
  starred: new Set(STARRED.map(r => r.full_name)),
  notifications: NOTIFICATIONS.map(n => ({ ...n })),
  aiKeys: { gemini: true, chatgpt: false },
  extraComments: new Map<string, ReturnType<typeof commentsFor>>(),
};

const LATENCY = Number(import.meta.env.VITE_MOCK_LATENCY ?? 350);
const wait = () => new Promise(r => setTimeout(r, LATENCY * (0.6 + Math.random() * 0.8)));

type Params = Record<string, string>;
type Handler = (m: RegExpMatchArray, params: Params, body: unknown) => unknown | { __status: number; data: unknown; headers?: Record<string, string> };

const withHeaders = (data: unknown, headers: Record<string, string>) => ({ __status: 200, data, headers });
const status = (code: number, data: unknown = { error: 'Mock error' }) => ({ __status: code, data });

const paginate = <T,>(items: T[], page: number, perPage: number) => ({
  slice: items.slice((page - 1) * perPage, page * perPage),
  hasMore: page * perPage < items.length,
});

// Very small GitHub search-query interpreter, enough for the app's filters.
const filterIssues = (q: string, items: MockIssue[]) => {
  let out = items;
  const repo = q.match(/repo:(\S+)/)?.[1];
  if (repo) out = out.filter(i => i.repository_url.endsWith(`/${repo}`));
  const lang = q.match(/language:(\S+)/)?.[1];
  if (lang) out = out.filter(i => findRepo(i.repository_url.split('/repos/')[1])?.language.toLowerCase() === lang.toLowerCase());
  const labels = [...q.matchAll(/label:(?:"([^"]+)"|(\S+))/g)].map(m => (m[1] ?? m[2]).toLowerCase());
  if (labels.length) out = out.filter(i => labels.every(l => i.labels.some(x => x.name.toLowerCase() === l)));
  if (/comments:0\b/.test(q)) out = out.filter(i => i.comments === 0);
  if (/comments:1\.\.5/.test(q)) out = out.filter(i => i.comments >= 1 && i.comments <= 5);
  if (/comments:6\.\.10/.test(q)) out = out.filter(i => i.comments >= 6 && i.comments <= 10);
  if (/comments:>10/.test(q)) out = out.filter(i => i.comments > 10);
  const since = q.match(/(?:created|updated):>=(\S+)/)?.[1];
  if (since) out = out.filter(i => i.created_at >= since);
  return out;
};

// Unknown repositories get a generated stand-in so any link works in mock mode.
const repoFrom = (owner: string, name: string) => findRepo(`${owner}/${name}`) ?? {
  ...REPOS[0],
  id: 9000 + owner.length * 31 + name.length,
  name,
  full_name: `${owner}/${name}`,
  description: `Mock stand-in for ${owner}/${name}`,
  html_url: `https://github.com/${owner}/${name}`,
  owner: { login: owner, avatar_url: `https://github.com/${owner}.png?size=80` },
};

const routes: [string, RegExp, Handler][] = [
  // Auth
  ['get', /^\/auth\/me$/, () => ({ user: ME })],
  ['post', /^\/auth\/logout$/, () => ({ ok: true })],

  // Issues
  ['get', /^\/api\/github\/search\/issues$/, (_, p) => {
    const page = Number(p.page || 1);
    const perPage = Number(p.per_page || 100);
    let items = filterIssues(p.q ?? '', ISSUES);
    const repoQ = (p.q ?? '').match(/repo:(\S+)/)?.[1];
    if (repoQ && items.length === 0) {
      const [o, n] = repoQ.split('/');
      const repo = repoFrom(o, n);
      items = Array.from({ length: 8 }, (_, i) => makeIssue(repo, 300 + i * 17, i * 3));
    }
    const sorted = p.sort === 'comments' ? [...items].sort((a, b) => b.comments - a.comments)
      : p.order === 'asc' ? [...items].reverse() : items;
    return { items: paginate(sorted, page, perPage).slice, total_count: items.length };
  }],
  ['get', /^\/api\/issues\/suggested$/, (_, p) => {
    let items = ISSUES.filter(i => i.labels.some(l => l.name === 'good first issue' || l.name === 'help wanted'));
    if (p.language) items = items.filter(i => findRepo(i.repository_url.split('/repos/')[1])?.language.toLowerCase() === p.language);
    if (p.famousOnly === 'true') items = items.filter(i => i.repoStars >= 10000);
    if (p.commentsRange === '0') items = items.filter(i => i.comments === 0);
    if (p.commentsRange === '1-5') items = items.filter(i => i.comments >= 1 && i.comments <= 5);
    const page = Number(p.page || 1);
    const { slice, hasMore } = paginate(items, page, 30);
    return { items: slice, total_count: items.length, hasMore, currentPage: page };
  }],
  ['get', /^\/api\/issues\/assigned$/, (_, p) => (p.state === 'closed' ? ASSIGNED_CLOSED : ASSIGNED_OPEN)],
  ['get', /^\/api\/issues\/(\d+)\/comments$/, (m, p) => {
    const num = Number(m[1]);
    const issue = [...ISSUES, ...ASSIGNED_OPEN, ...ASSIGNED_CLOSED].find(i => i.number === num);
    const key = `${p.owner}/${p.repo}#${num}`;
    const all = [...commentsFor(num, issue?.comments ?? 2), ...(state.extraComments.get(key) ?? [])];
    const page = Number(p.page || 1);
    const { slice, hasMore } = paginate(all, page, 10);
    return { comments: slice, count: slice.length, hasMore, nextPage: hasMore ? page + 1 : null };
  }],
  ['post', /^\/api\/repos\/([^/]+)\/([^/]+)\/issues\/(\d+)\/comments$/, (m, _, body) => {
    const key = `${m[1]}/${m[2]}#${m[3]}`;
    const list = state.extraComments.get(key) ?? [];
    list.push({
      id: Date.now(), body: (body as { body?: string })?.body ?? '',
      user: { login: ME.login, avatar_url: ME.avatar_url }, createdAt: daysAgo(0), updatedAt: daysAgo(0),
    });
    state.extraComments.set(key, list);
    return { ok: true };
  }],

  // Repositories
  ['get', /^\/api\/repos\/([^/]+)\/([^/]+)\/starred$/, m => ({ starred: state.starred.has(`${m[1]}/${m[2]}`) })],
  ['put', /^\/api\/repos\/([^/]+)\/([^/]+)\/starred$/, m => { state.starred.add(`${m[1]}/${m[2]}`); return { starred: true }; }],
  ['delete', /^\/api\/repos\/([^/]+)\/([^/]+)\/starred$/, m => { state.starred.delete(`${m[1]}/${m[2]}`); return { starred: false }; }],
  ['get', /^\/api\/repos\/([^/]+)\/([^/]+)\/contributors\/stats$/, m => topContributorsFor(`${m[1]}/${m[2]}`)],
  ['get', /^\/api\/repos\/([^/]+)\/([^/]+)\/lottery-contributors$/, m => lotteryFor(`${m[1]}/${m[2]}`)],
  ['get', /^\/api\/repos\/([^/]+)\/([^/]+)\/contributor-confidence$/, m => confidenceFor(`${m[1]}/${m[2]}`)],
  ['get', /^\/api\/repos\/([^/]+)\/([^/]+)\/pulls\/(\d+)$/, m => {
    const repo = repoFrom(m[1], m[2]);
    return repo ? pullDetails(repo, Number(m[3])) : status(404);
  }],
  ['get', /^\/api\/repos\/([^/]+)\/([^/]+)\/pulls$/, (m, p) => {
    const repo = repoFrom(m[1], m[2]);
    if (!repo) return status(404);
    const all = pullsFor(repo, p.state === 'closed' ? 'closed' : 'open');
    const page = Number(p.page || 1);
    const { slice, hasMore } = paginate(all, page, 10);
    return { pullRequests: slice, hasMore, nextPage: hasMore ? page + 1 : null, totalCount: all.length };
  }],
  ['get', /^\/api\/repos\/([^/]+)\/([^/]+)$/, m => (m[1] === 'missing' ? status(404, { error: 'Not Found' }) : repoFrom(m[1], m[2]))],

  // GitHub proxy
  ['get', /^\/api\/github\/search\/repositories$/, (_, p) => {
    const q = (p.q ?? '').toLowerCase();
    const items = REPOS.filter(r => `${r.full_name} ${r.description} ${r.language} ${r.topics.join(' ')}`.toLowerCase().includes(q));
    return { items, total_count: items.length };
  }],
  ['get', /^\/api\/github\/search\/users$/, (_, p) => {
    const page = Number(p.page || 1);
    const perPage = Number(p.per_page || 10);
    const q = (p.q ?? '').replace(/type:user|followers:>\d+/g, '').trim().toLowerCase();
    const items = SEARCH_USERS.filter(u => !q || u.login.includes(q) || (u.name ?? '').toLowerCase().includes(q));
    return { items: paginate(items, page, perPage).slice, total_count: items.length };
  }],
  ['get', /^\/api\/github\/user\/repos$/, (_, p) => paginate(USER_REPOS, Number(p.page || 1), Number(p.per_page || 30)).slice],
  ['get', /^\/api\/github\/user\/starred$/, (_, p) => {
    const perPage = Number(p.per_page || 30);
    const page = Number(p.page || 1);
    const all = REPOS.filter(r => state.starred.has(r.full_name));
    const { slice, hasMore } = paginate(all, page, perPage);
    const last = Math.max(1, Math.ceil(all.length / perPage));
    const link = hasMore ? `<mock?page=${page + 1}>; rel="next", <mock?page=${last}>; rel="last"` : '';
    return withHeaders(slice, link ? { link } : {});
  }],
  ['get', /^\/api\/github\/users\/([^/]+)\/events\/public$/, m => activityFor(m[1])],
  ['get', /^\/api\/github\/users\/([^/]+)\/starred$/, () => withHeaders([REPOS[0]], { link: '<mock?page=2>; rel="next", <mock?page=23>; rel="last"' })],
  ['get', /^\/api\/github\/users\/([^/]+)\/orgs$/, () => ['vercel', 'grafana'].map((login, i) => ({ id: i, login, avatar_url: `https://github.com/${login}.png?size=80` }))],
  ['get', /^\/api\/github\/users\/([^/]+)\/(followers|following)$/, (_, p) =>
    paginate(SEARCH_USERS.map(u => ({ id: u.id, login: u.login, avatar_url: u.avatar_url })), Number(p.page || 1), Number(p.per_page || 30)).slice],
  ['get', /^\/api\/github\/users\/([^/]+)\/repos$/, m => USER_REPOS.map(r => ({
    ...r, full_name: `${m[1]}/${r.name}`, html_url: `https://github.com/${m[1]}/${r.name}`, owner: { login: m[1], avatar_url: avatar(m[1]) },
  }))],
  ['get', /^\/api\/github\/users\/([^/]+)$/, m => userProfile(m[1]) ?? status(404, { message: 'Not Found' })],

  // Hackathons
  ['get', /^\/api\/hackathons$/, (_, p) => {
    const now = Date.now();
    let list = HACKATHONS;
    const search = (p.search ?? '').toLowerCase();
    if (search) list = list.filter(h => `${h.title} ${h.tags.join(' ')}`.toLowerCase().includes(search));
    if (p.filter === 'upcoming') list = list.filter(h => new Date(h.startDate).getTime() > now);
    if (p.filter === 'active') list = list.filter(h => new Date(h.startDate).getTime() <= now && new Date(h.endDate).getTime() >= now);
    if (p.filter === 'past') list = list.filter(h => new Date(h.endDate).getTime() < now);
    const limit = Number(p.limit || 10);
    const page = Number(p.page || 1);
    return {
      hackathons: paginate(list, page, limit).slice,
      totalPages: Math.max(1, Math.ceil(list.length / limit)),
      currentPage: page,
      totalHackathons: list.length,
    };
  }],

  // Notifications
  ['get', /^\/api\/notifications$/, (_, p) => ({
    notifications: state.notifications.slice(0, Number(p.limit || 50)),
    unreadCount: state.notifications.filter(n => !n.is_read).length,
  })],
  ['put', /^\/api\/notifications\/read-all$/, () => { state.notifications.forEach(n => { n.is_read = true; }); return { ok: true }; }],
  ['put', /^\/api\/notifications\/([^/]+)\/read$/, m => {
    const n = state.notifications.find(x => x.id === m[1]);
    if (n) n.is_read = true;
    return { ok: true };
  }],

  // Settings, feedback, newsletter
  ['get', /^\/api\/ai-keys$/, () => ({ ...state.aiKeys })],
  ['put', /^\/api\/ai-keys\/(gemini|chatgpt)$/, m => { state.aiKeys[m[1] as 'gemini' | 'chatgpt'] = true; return { ok: true }; }],
  ['delete', /^\/api\/ai-keys\/(gemini|chatgpt)$/, m => { state.aiKeys[m[1] as 'gemini' | 'chatgpt'] = false; return { ok: true }; }],
  ['post', /^\/api\/feedback$/, () => ({ message: 'Thanks for the feedback!' })],
  ['post', /^\/api\/newsletter\/subscribe$/, () => ({ message: "You're subscribed. First email arrives on Monday." })],
];

const toParams = (config: InternalAxiosRequestConfig, url: URL): Params => {
  const out: Params = {};
  url.searchParams.forEach((v, k) => { out[k] = v; });
  const p = config.params;
  if (p instanceof URLSearchParams) p.forEach((v, k) => { out[k] = v; });
  else if (p && typeof p === 'object') Object.entries(p).forEach(([k, v]) => { if (v != null) out[k] = String(v); });
  return out;
};

export const mockAdapter: AxiosAdapter = async config => {
  await wait();
  const url = new URL(config.url ?? '', 'http://mock.local');
  const method = (config.method ?? 'get').toLowerCase();
  const params = toParams(config, url);
  let body: unknown = config.data;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { /* keep raw */ } }

  for (const [m, re, handler] of routes) {
    if (m !== method) continue;
    const match = url.pathname.match(re);
    if (!match) continue;
    const result = handler(match, params, body);
    const isWrapped = typeof result === 'object' && result !== null && '__status' in (result as object);
    const { __status, data, headers } = isWrapped
      ? (result as { __status: number; data: unknown; headers?: Record<string, string> })
      : { __status: 200, data: result, headers: {} };
    const response: AxiosResponse = { data, status: __status, statusText: String(__status), headers: headers ?? {}, config, request: {} };
    if (__status >= 400) throw new AxiosError(`Request failed with status code ${__status}`, String(__status), config, {}, response);
    return response;
  }

  console.warn(`[mock] No handler for ${method.toUpperCase()} ${url.pathname}`);
  const response: AxiosResponse = { data: { error: 'No mock handler' }, status: 404, statusText: 'Not Found', headers: {}, config, request: {} };
  throw new AxiosError('Mock route not found', '404', config, {}, response);
};
