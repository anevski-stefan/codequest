import axios from 'axios';
import { store } from '../store';
import { logout } from '../features/auth/authSlice';
import type { IssueParams, IssueResponse, Issue, GithubUser } from '../types/github';
const resolveApiBaseUrl = () => {
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(base);
  if (!/^https?:\/\//i.test(base)) {
    throw new Error('VITE_API_URL must start with http:// or https://');
  }
  if (base.startsWith('http://') && !isLocalhost) {
    if (import.meta.env.PROD) {
      throw new Error('VITE_API_URL must use HTTPS in production');
    }
    console.warn(`[api] VITE_API_URL uses insecure HTTP (${base}); production builds require HTTPS`);
  }
  return base;
};
export const API_BASE_URL = resolveApiBaseUrl();
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 && isSessionExpiryResponse(error.config?.url)) {
      store.dispatch(logout());
    }
    return Promise.reject(error);
  }
);
// A 401 from any auth-dependent endpoint (comments, chats, repos, ai-keys, github proxy,
// activity, ...) indicates an expired/invalid session, so we sign the user out. Endpoints
// that legitimately return 401 without a broken session (auth bootstrap, public hackathons,
// newsletter/feedback) are excluded.
const SESSION_AGNOSTIC_PREFIXES = ['/auth/', '/api/hackathons', '/api/newsletter', '/api/feedback'];
const isSessionExpiryResponse = (url?: string): boolean => {
  if (!url) return false;
  const path = url.split('?')[0];
  return !SESSION_AGNOSTIC_PREFIXES.some(prefix => path.startsWith(prefix));
};
interface RawGitHubUser {
  login?: unknown;
  avatar_url?: unknown;
}
interface RawGitHubIssue {
  id?: unknown;
  number?: unknown;
  title?: unknown;
  body?: unknown;
  state?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  comments?: unknown;
  labels?: unknown;
  repository_url?: unknown;
  html_url?: unknown;
  user?: RawGitHubUser;
  repoStars?: unknown;
}
const safeString = (value: unknown): string => (typeof value === 'string' ? value : '');
const safeNumber = (value: unknown): number => (typeof value === 'number' && !Number.isNaN(value) ? value : 0);
const transformIssue = (item: RawGitHubIssue): Issue => {
  const user = item.user && typeof item.user === 'object' ? item.user : {};
  const labels = Array.isArray(item.labels)
    ? item.labels.filter((l: unknown): l is Record<string, unknown> => Boolean(l) && typeof l === 'object')
    : [];
  const repoUrl = safeString(item.repository_url);
  const repoParts = repoUrl.split('/').filter(Boolean);
  return {
    id: safeNumber(item.id),
    number: safeNumber(item.number),
    title: safeString(item.title),
    body: typeof item.body === 'string' ? item.body : null,
    state: safeString(item.state),
    createdAt: safeString(item.created_at),
    updatedAt: safeString(item.updated_at),
    commentsCount: safeNumber(item.comments),
    labels: labels.map(label => ({
      name: safeString(label.name),
      color: safeString(label.color)
    })),
    repository: {
      id: repoParts[repoParts.length - 1] || '',
      fullName: repoParts.slice(-2).join('/'),
      url: repoUrl
    },
    user: {
      login: safeString(user.login),
      avatarUrl: safeString(user.avatar_url)
    },
    url: safeString(item.html_url),
    repoStars: typeof item.repoStars === 'number' ? item.repoStars : undefined,
  };
};
// Map UI sort values ('created' | 'created-asc' | 'updated' | 'comments') to a valid GitHub search sort param.
const toApiSort = (sort: string): string => sort === 'created-asc' ? 'created' : sort;
// Date field used for the time-frame recency qualifier (only 'created'/'updated' are valid date fields).
const toDateField = (sort: string): string => sort === 'updated' ? 'updated' : 'created';
const isAuthenticated = () => store.getState().auth.isAuthenticated;
const fetchIssues = async (searchQuery: string, sort: string, direction?: string, page?: number): Promise<IssueResponse> => {
  const queryParams = new URLSearchParams({
    q: searchQuery.trim(),
    sort: toApiSort(sort),
    order: direction || 'desc',
    per_page: '100',
    page: page?.toString() || '1'
  });
  const { data } = await api.get('/api/github/search/issues', { params: queryParams });
  if (!data?.items) {
    throw new Error('No data received from API');
  }
  return {
    issues: data.items.map(transformIssue),
    totalCount: data.total_count,
    hasMore: data.total_count > (page || 1) * 100,
    currentPage: parseInt(page?.toString() || '1')
  };
};

export const getIssues = async (params: IssueParams): Promise<IssueResponse> => {
  let searchQuery = 'is:issue is:unlocked ';
  let startDate: string | undefined;
  if (params.language) {
    searchQuery += `language:${params.language} `;
  }
  if (params.state) {
    searchQuery += `is:${params.state} `;
  }
  if (params.labels && params.labels.length > 0) {
    params.labels.forEach(label => {
      const encodedLabel = label.includes(' ') ? `"${label}"` : label;
      searchQuery += `label:${encodedLabel} `;
    });
  }
  if (params.timeFrame && params.timeFrame !== 'all') {
    const now = new Date();
    switch (params.timeFrame) {
      case 'day':
        {
          const yesterday = new Date(now);
          yesterday.setHours(now.getHours() - 24);
          yesterday.setMinutes(now.getMinutes());
          yesterday.setSeconds(now.getSeconds());
          startDate = yesterday.toISOString();
          break;
        }
      case 'week':
        {
          const lastWeek = new Date(now);
          lastWeek.setDate(now.getDate() - 7);
          startDate = lastWeek.toISOString();
          break;
        }
      case 'month':
        {
          const lastMonth = new Date(now);
          lastMonth.setMonth(now.getMonth() - 1);
          startDate = lastMonth.toISOString();
          break;
        }
      case 'year':
        {
          const lastYear = new Date(now);
          lastYear.setFullYear(now.getFullYear() - 1);
          startDate = lastYear.toISOString();
          break;
        }
    }
    searchQuery += `${toDateField(params.sort)}:>=${startDate} `;
  }
  if (params.commentsRange) {
    switch (params.commentsRange) {
      case '0':
        searchQuery += 'comments:0 ';
        break;
      case '1-5':
        searchQuery += 'comments:1..5 ';
        break;
      case '6-10':
        searchQuery += 'comments:6..10 ';
        break;
      case '10+':
        searchQuery += 'comments:>10 ';
        break;
    }
  }
  if (params.unassigned === true) {
    searchQuery += 'no:assignee ';
  }
  return fetchIssues(searchQuery, params.sort, params.direction, params.page);
};

export const getIssueComments = async (issueNumber: number, repoFullName: string, page = 1) => {
  const [owner, repo] = repoFullName.split('/');
  const response = await api.get(`/api/issues/${issueNumber}/comments`, {
    params: {
      owner,
      repo,
      page
    }
  });
  return response.data;
};
export const addIssueComment = async (issueNumber: number, repoFullName: string, comment: string) => {
  const [owner, repo] = repoFullName.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid repository name: ${repoFullName}`);
  }
  if (!isAuthenticated()) {
    throw new Error('No authentication token found');
  }
  const response = await api.post(`/api/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
    body: comment
  });
  return response.data;
};
export const getAssignedIssues = async (state?: string): Promise<IssueResponse> => {
  try {
    if (!isAuthenticated()) {
      throw new Error('Authentication required');
    }
    const {
      data
    } = await api.get('/api/issues/assigned', {
      params: {
        state
      }
    });
    const raw = Array.isArray(data) ? data : data?.issues;
    if (!raw || !Array.isArray(raw)) {
      throw new Error('Invalid response format from server');
    }
    return {
      issues: raw.map(transformIssue),
      totalCount: raw.length,
      currentPage: 1,
      hasMore: false
    };
  } catch (error) {
    console.error('Error in getAssignedIssues:', error);
    throw error;
  }
};
export interface SuggestedIssueParams {
  language?: string;
  commentsRange?: string;
  timeFrame?: string;
  page?: number;
  famousOnly?: boolean;
}

export const getSuggestedIssues = async (params: SuggestedIssueParams): Promise<IssueResponse> => {
  const { data } = await api.get('/api/issues/suggested', {
    params: {
      language: params.language || '',
      commentsRange: params.commentsRange ?? '',
      timeFrame: params.timeFrame || 'month',
      page: params.page || 1,
      famousOnly: params.famousOnly ? 'true' : 'false',
    },
  });
  return {
    issues: (data.items ?? []).map(transformIssue),
    totalCount: data.total_count ?? 0,
    hasMore: data.hasMore ?? false,
    currentPage: data.currentPage ?? 1,
  };
};
export const explainIssue = async ({
  owner,
  repo,
  issueTitle,
  issueBody,
  comments,
  repoLanguage,
  repoDescription,
  onChunk,
  onDone,
  onError,
}: {
  owner: string;
  repo: string;
  issueTitle: string;
  issueBody: string | null;
  comments: Array<{ user: { login: string }; body: string }>;
  repoLanguage?: string | null;
  repoDescription?: string;
  onChunk: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}): Promise<void> => {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/issues/explain/${owner}/${repo}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        issueTitle,
        issueBody,
        comments: comments.slice(0, 10).map(c => ({ user: { login: c.user.login }, body: c.body })),
        repoLanguage,
        repoDescription,
      }),
    });
  } catch {
    onError('Network error — could not reach the server.');
    return;
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    onError(err.error || `HTTP ${response.status}`);
    return;
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') { onDone(); return; }
      try {
        const parsed = JSON.parse(data);
        if (parsed.error) { onError(parsed.error); return; }
        if (parsed.text) onChunk(parsed.text);
      } catch { /* skip malformed chunk */ }
    }
  }
  onDone();
};

export const onboardRepo = async ({
  owner,
  repo,
  onChunk,
  onDone,
  onError,
}: {
  owner: string;
  repo: string;
  onChunk: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}): Promise<void> => {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/repos/${owner}/${repo}/onboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
  } catch {
    onError('Network error — could not reach the server.');
    return;
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    onError(err.error || `HTTP ${response.status}`);
    return;
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6);
      if (raw === '[DONE]') { onDone(); return; }
      try {
        const parsed = JSON.parse(raw);
        if (parsed.error) { onError(parsed.error); return; }
        if (parsed.text) onChunk(parsed.text);
      } catch { /* skip malformed chunk */ }
    }
  }
  onDone();
};

export const getRepositoryIssues = async (owner: string, repo: string, page = 1): Promise<IssueResponse> => {
  return fetchIssues(`repo:${owner}/${repo} is:issue is:open`, 'created', 'desc', page);
};

export const checkRepoStarred = async (owner: string, repo: string): Promise<boolean> => {
  const { data } = await api.get(`/api/repos/${owner}/${repo}/starred`);
  return data.starred as boolean;
};

export const starRepo = async (owner: string, repo: string): Promise<void> => {
  await api.put(`/api/repos/${owner}/${repo}/starred`);
};

export const unstarRepo = async (owner: string, repo: string): Promise<void> => {
  await api.delete(`/api/repos/${owner}/${repo}/starred`);
};

export const getRepositoryDetails = async (owner: string, repo: string) => {
  const {
    data
  } = await api.get(`/api/repos/${owner}/${repo}`);
  return data;
};
export const getTopContributors = async (owner: string, repo: string) => {
  const {
    data
  } = await api.get(`/api/repos/${owner}/${repo}/contributors/stats`);
  return data;
};
export const getLotteryContributors = async (owner: string, repo: string) => {
  const {
    data
  } = await api.get(`/api/repos/${owner}/${repo}/lottery-contributors`);
  return data;
};
export const getContributorConfidence = async (owner: string, repo: string) => {
  const {
    data
  } = await api.get(`/api/repos/${owner}/${repo}/contributor-confidence`);
  return data;
};
export const getRepositoryPullRequests = async (owner: string, repo: string, state: 'open' | 'closed', page: number = 1) => {
  const params = new URLSearchParams({
    state,
    page: page.toString()
  });
  const {
    data
  } = await api.get(`/api/repos/${owner}/${repo}/pulls?${params}`);
  return data;
};
export const getPullRequestDetails = async (owner: string, repo: string, pullNumber: number) => {
  const {
    data
  } = await api.get(`/api/repos/${owner}/${repo}/pulls/${pullNumber}`);
  return data;
};
export const searchTopContributors = async (query: string, page: number = 1): Promise<{
  users: GithubUser[];
  hasMore: boolean;
}> => {
  const perPage = 10;
  const {
    data
  } = await api.get('/api/github/search/users', {
    params: {
      q: `${query} type:user`,
      sort: 'followers',
      order: 'desc',
      page,
      per_page: perPage
    }
  });
  return {
    users: data.items,
    hasMore: data.total_count > page * perPage
  };
};
export const getUserRepositories = async (page: number, perPage: number) => {
  const {
    data
  } = await api.get('/api/github/user/repos', {
    params: {
      sort: 'updated',
      per_page: perPage,
      page
    }
  });
  return data;
};
export const getUserActivities = async (username: string) => {
  const {
    data
  } = await api.get(`/api/github/users/${username}/events/public`);
  return data;
};
export interface StarredRepo {
  id: number;
  full_name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  topics: string[];
  html_url: string;
  updated_at: string;
  owner: { login: string; avatar_url: string };
}

export const getStarredRepos = async (page = 1, perPage = 30): Promise<{ repos: StarredRepo[]; hasMore: boolean }> => {
  const response = await api.get('/api/github/user/starred', {
    params: { per_page: perPage, page, sort: 'updated', direction: 'desc' },
  });
  const links: string | undefined = response.headers['link'];
  const hasMore = !!links?.includes('rel="next"');
  return { repos: response.data as StarredRepo[], hasMore };
};

export const getUserStarredCount = async (username?: string) => {
  const url = username
    ? `/api/github/users/${username}/starred`
    : '/api/github/user/starred';
  const response = await api.get(url, {
    params: {
      per_page: 1
    }
  });
  const links = response.headers['link'];
  const match = links?.match(/page=(\d+)>; rel="last"/);
  // No "last" link means everything fit on one page (per_page=1 → 0 or 1).
  if (match) return parseInt(match[1]);
  return Array.isArray(response.data) ? response.data.length : 0;
};

