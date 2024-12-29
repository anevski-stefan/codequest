import axios from 'axios';
import type { IssueParams, IssueResponse } from '../types/github';
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});
const etagStore = new Map<string, string>();
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }
  const etag = etagStore.get(config.url || '');
  if (etag) {
    config.headers['If-None-Match'] = etag;
  }
  return config;
});
api.interceptors.response.use(response => {
  const etag = response.headers['etag'];
  if (etag) {
    etagStore.set(response.config.url || '', etag);
  }
  return response;
}, error => {
  if (error.response?.status === 304) {
    return Promise.resolve(error.response);
  }
  return Promise.reject(error);
});
export const getIssues = async (params: IssueParams): Promise<IssueResponse> => {
  let searchQuery = 'is:issue is:unlocked ';
  let startDate: string | undefined;
  let endDate: string | undefined;
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
    endDate = now.toISOString();
    switch (params.timeFrame) {
      case 'day':
        const yesterday = new Date(now);
        yesterday.setHours(now.getHours() - 24);
        yesterday.setMinutes(now.getMinutes());
        yesterday.setSeconds(now.getSeconds());
        startDate = yesterday.toISOString();
        break;
      case 'week':
        const lastWeek = new Date(now);
        lastWeek.setDate(now.getDate() - 7);
        startDate = lastWeek.toISOString();
        break;
      case 'month':
        const lastMonth = new Date(now);
        lastMonth.setMonth(now.getMonth() - 1);
        startDate = lastMonth.toISOString();
        break;
      case 'year':
        const lastYear = new Date(now);
        lastYear.setFullYear(now.getFullYear() - 1);
        startDate = lastYear.toISOString();
        break;
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
  console.log('Search query:', {
    searchQuery,
    sort: params.sort,
    order: params.direction,
    timeFrame: params.timeFrame,
    fullQuery: `https://api.github.com/search/issues?${queryParams}`,
    startDate: params.timeFrame !== 'all' ? startDate : null,
    endDate: params.timeFrame !== 'all' ? endDate : null
  });
  try {
    const response = await fetch(`https://api.github.com/search/issues?${queryParams}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        query: searchQuery
      });
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    const transformedIssues = data.items.map((item: any) => ({
      id: item.id,
      number: item.number,
      title: item.title,
      body: item.body,
      state: item.state,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      commentsCount: item.comments,
      labels: item.labels.map((label: any) => ({
        name: label.name,
        color: label.color
      })),
      repository: {
        id: item.repository_url.split('/').pop(),
        fullName: item.repository_url.split('/').slice(-2).join('/'),
        url: item.repository_url
      },
      user: {
        login: item.user.login,
        avatarUrl: item.user.avatar_url
      },
      url: item.html_url
    }));
    return {
      issues: transformedIssues,
      totalCount: data.total_count,
      hasMore: data.total_count > (params.page || 1) * 100,
      currentPage: parseInt(params.page?.toString() || '1')
    };
  } catch (error) {
    console.error('Failed to fetch issues:', error);
    throw error;
  }
};
export const getActivity = async () => {
  const {
    data
  } = await api.get('/api/activity');
  return data;
};
export const getIssueComments = async (issueNumber: number, repoFullName: string, page = 1) => {
  try {
    const [owner, repo] = repoFullName.split('/');
    console.log('Fetching comments for:', {
      issueNumber,
      owner,
      repo,
      page
    });
    const response = await api.get(`/api/issues/${issueNumber}/comments`, {
      params: {
        owner,
        repo,
        page
      }
    });
    console.log('Comments response:', response);
    return response.data;
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }
};
export const addIssueComment = async (issueNumber: number, repoFullName: string, comment: string) => {
  try {
    const [owner, repo] = repoFullName.split('/');
    if (!owner || !repo) {
      throw new Error(`Invalid repository name: ${repoFullName}`);
    }
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    console.log('Adding comment:', {
      owner,
      repo,
      issueNumber,
      comment
    });
    const response = await api.post(`/api/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
      body: comment
    }, {
      headers: {
        Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('Comment created:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};
export const getAssignedIssues = async (state?: string): Promise<IssueResponse> => {
  try {
    const {
      data
    } = await api.get('/api/assigned-issues', {
      params: {
        state
      }
    });
    return data;
  } catch (error) {
    console.error('Failed to fetch assigned issues:', error);
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
    searchQuery += 'created:2024-01-01..* ';
  }
  console.log('Final search query:', searchQuery);
  const queryParams = new URLSearchParams({
    q: searchQuery.trim(),
    sort: params.sort,
    order: params.direction || 'desc',
    per_page: '100',
    page: params.page?.toString() || '1'
  });
  console.log('Suggested Issues Search query:', {
    searchQuery,
    sort: params.sort,
    order: params.direction,
    fullQuery: `https://api.github.com/search/issues?${queryParams}`,
    labels: params.labels
  });
  try {
    const response = await fetch(`https://api.github.com/search/issues?${queryParams}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        query: searchQuery
      });
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    console.log('GitHub API Response:', {
      totalCount: data.total_count,
      itemsCount: data.items?.length,
      firstItem: data.items?.[0],
      rateLimit: {
        remaining: response.headers.get('x-ratelimit-remaining'),
        limit: response.headers.get('x-ratelimit-limit'),
        reset: response.headers.get('x-ratelimit-reset')
      }
    });
    const transformedIssues = data.items.map((item: any) => ({
      id: item.id,
      number: item.number,
      title: item.title,
      body: item.body,
      state: item.state,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      commentsCount: item.comments,
      labels: item.labels.map((label: any) => ({
        name: label.name,
        color: label.color
      })),
      repository: {
        id: item.repository_url.split('/').pop(),
        fullName: item.repository_url.split('/').slice(-2).join('/'),
        url: item.repository_url
      },
      user: {
        login: item.user.login,
        avatarUrl: item.user.avatar_url
      },
      url: item.html_url
    }));
    return {
      issues: transformedIssues,
      totalCount: data.total_count,
      hasMore: data.total_count > (params.page || 1) * 100,
      currentPage: parseInt(params.page?.toString() || '1')
    };
  } catch (error) {
    console.error('Failed to fetch suggested issues:', error);
    throw error;
  }
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
export const getRepositoryPullRequests = async (owner: string, repo: string, state: 'open' | 'closed', page: number = 1, includeDetails: boolean = true) => {
  const params = new URLSearchParams({
    state,
    page: page.toString(),
    includeDetails: includeDetails.toString()
  });
  const {
    data
  } = await api.get(`/api/repos/${owner}/${repo}/pulls?${params}`);
  return data;
};