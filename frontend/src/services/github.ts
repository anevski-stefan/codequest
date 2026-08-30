import axios from 'axios';
import { store } from '../store';
import { logout } from '../features/auth/authSlice';
import type { IssueParams, IssueResponse, Issue, Label, GithubUser } from '../types/github';
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      store.dispatch(logout());
    }
    return Promise.reject(error);
  }
);
interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  created_at: string;
  updated_at: string;
  comments: number;
  labels: Label[];
  repository_url: string;
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
  };
}
const transformIssue = (item: GitHubIssue): Issue => ({
  id: item.id,
  number: item.number,
  title: item.title,
  body: item.body,
  state: item.state,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
  commentsCount: item.comments,
  labels: item.labels.map(label => ({
    name: label.name,
    color: label.color
  })),
  repository: {
    id: item.repository_url.split('/').pop() || '',
    fullName: item.repository_url.split('/').slice(-2).join('/'),
    url: item.repository_url
  },
  user: {
    login: item.user.login,
    avatarUrl: item.user.avatar_url
  },
  url: item.html_url
});
const isAuthenticated = () => store.getState().auth.isAuthenticated;
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
    searchQuery += `${params.sort}:>=${startDate} `;
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
  const queryParams = new URLSearchParams({
    q: searchQuery.trim(),
    sort: params.sort,
    order: params.direction || 'desc',
    per_page: '100',
    page: params.page?.toString() || '1'
  });
  const {
    data
  } = await api.get('/api/github/search/issues', {
    params: queryParams
  });
  const transformedIssues = data.items.map(transformIssue);
  return {
    issues: transformedIssues,
    totalCount: data.total_count,
    hasMore: data.total_count > (params.page || 1) * 100,
    currentPage: parseInt(params.page?.toString() || '1')
  };
};
export const getActivity = async () => {
  const {
    data
  } = await api.get('/api/activity');
  return data;
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
export const getSuggestedIssues = async (params: IssueParams): Promise<IssueResponse> => {
  let searchQuery = 'is:issue is:open no:assignee ';
  if (params.labels && params.labels.length > 0) {
    searchQuery += 'label:"good first issue" label:"help wanted" ';
  }
  if (params.commentsRange === '0') {
    searchQuery += 'comments:0 ';
  }
  if (params.timeFrame === 'month') {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    searchQuery += `created:>=${since} `;
  }
  const queryParams = new URLSearchParams({
    q: searchQuery.trim(),
    sort: params.sort,
    order: params.direction || 'desc',
    per_page: '100',
    page: params.page?.toString() || '1'
  });
  const {
    data
  } = await api.get('/api/github/search/issues', {
    params: queryParams
  });
  if (!data) {
    throw new Error('No data received from API');
  }
  const result = {
    issues: data.items.map(transformIssue),
    totalCount: data.total_count,
    hasMore: data.total_count > (params.page || 1) * 100,
    currentPage: parseInt(params.page?.toString() || '1')
  };
  return result;
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
export const getUserStarredCount = async () => {
  const response = await api.get('/api/github/user/starred', {
    params: {
      per_page: 1
    }
  });
  const links = response.headers['link'];
  const match = links?.match(/page=(\d+)>; rel="last"/);
  return match ? parseInt(match[1]) : 0;
};