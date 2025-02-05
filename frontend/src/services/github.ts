import axios from 'axios';
import type { 
  IssueParams, 
  IssueResponse, 
  Issue, 
  Label,
  GithubUser 
} from '../types/github';

// Export the api instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json'
  }
});

const etagStore = new Map<string, string>();

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  const etag = etagStore.get(config.url || '');
  if (etag) {
    config.headers['If-None-Match'] = etag;
  }
  
  return config;
});

api.interceptors.response.use(
  (response) => {
    const etag = response.headers['etag'];
    if (etag) {
      etagStore.set(response.config.url || '', etag);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 304) {
      return Promise.resolve(error.response);
    }
    return Promise.reject(error);
  }
);

// Define constants at the top level
const THROTTLE_WINDOW = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 10;
const requestTimestamps: number[] = [];

// Helper function for throttling
const isThrottled = () => {
  const now = Date.now();
  // Remove timestamps older than the window
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - THROTTLE_WINDOW) {
    requestTimestamps.shift();
  }
  return requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW;
};

// Add these interfaces at the top with other imports
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

// Update the transformIssue function
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

export const getIssues = async (params: IssueParams): Promise<IssueResponse> => {
  // Build the base search query
  let searchQuery = 'is:issue is:unlocked '; // Only get issues that allow comments
  let startDate: string | undefined;
  
  // Add language filter
  if (params.language) {
    searchQuery += `language:${params.language} `;
  }
  
  // Add state filter
  if (params.state) {
    searchQuery += `is:${params.state} `;
  }
  
  // Add labels filter with proper formatting
  if (params.labels && params.labels.length > 0) {
    params.labels.forEach(label => {
      const encodedLabel = label.includes(' ') ? `"${label}"` : label;
      searchQuery += `label:${encodedLabel} `;
    });
  }

  // Add time frame filter with precise timestamp handling
  if (params.timeFrame && params.timeFrame !== 'all') {
    const now = new Date();
    
    switch (params.timeFrame) {
      case 'day': {
        const yesterday = new Date(now);
        yesterday.setHours(now.getHours() - 24);
        yesterday.setMinutes(now.getMinutes());
        yesterday.setSeconds(now.getSeconds());
        startDate = yesterday.toISOString();
        break;
      }
      case 'week': {
        const lastWeek = new Date(now);
        lastWeek.setDate(now.getDate() - 7);
        startDate = lastWeek.toISOString();
        break;
      }
      case 'month': {
        const lastMonth = new Date(now);
        lastMonth.setMonth(now.getMonth() - 1);
        startDate = lastMonth.toISOString();
        break;
      }
      case 'year': {
        const lastYear = new Date(now);
        lastYear.setFullYear(now.getFullYear() - 1);
        startDate = lastYear.toISOString();
        break;
      }
    }
    
    // Add the time range filter to match issues updated OR created in the time range
    searchQuery += `${params.sort}:>=${startDate} `;
  }
  
  // Add comments range filter using GitHub's search syntax
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
  
  // Add unassigned filter
  if (params.unassigned === true) {
    searchQuery += 'no:assignee ';
  }

  // Create query parameters with proper sorting
  const queryParams = new URLSearchParams({
    q: searchQuery.trim(),
    sort: params.sort,  // Use the actual sort parameter from the filter
    order: params.direction || 'desc',
    per_page: '100',
    page: params.page?.toString() || '1'
  });

  const response = await fetch(`https://api.github.com/search/issues?${queryParams}`, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const transformedIssues = data.items.map(transformIssue);

  return {
    issues: transformedIssues,
    totalCount: data.total_count,
    hasMore: data.total_count > (params.page || 1) * 100,
    currentPage: parseInt(params.page?.toString() || '1')
  };
};

export const getActivity = async () => {
  const { data } = await api.get('/api/activity');
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

  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await api.post(
    `/api/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
    { body: comment },
    {
      headers: {
        Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
};

export const getAssignedIssues = async (state?: string): Promise<IssueResponse> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    const { data } = await api.get('/api/assigned-issues', {
      params: { state },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Check if data exists and has the expected structure
    if (!data || (!data.issues && !Array.isArray(data))) {
      throw new Error('Invalid response format from server');
    }

    // Transform the response to match IssueResponse type
    return {
      issues: Array.isArray(data) ? data : data.issues || [],
      totalCount: Array.isArray(data) ? data.length : (data.issues?.length || 0),
      currentPage: 1,
      hasMore: false
    };
  } catch (error) {
    console.error('Error in getAssignedIssues:', error);
    throw error;
  }
};

export const getSuggestedIssues = async (params: IssueParams): Promise<IssueResponse> => {
  const cacheKey = `suggested-issues-${JSON.stringify(params)}`;
  
  // Check localStorage cache first
  const cachedData = localStorage.getItem(cacheKey);
  if (cachedData) {
    const { data, timestamp } = JSON.parse(cachedData);
    if (Date.now() - timestamp < 10 * 60 * 1000) {
      return data;
    }
  }

  if (isThrottled()) {
    if (cachedData) {
      const { data } = JSON.parse(cachedData);
      return data;
    }
    throw new Error('Rate limit exceeded. Please wait before trying again.');
  }

  requestTimestamps.push(Date.now());

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

  const queryParams = new URLSearchParams({
    q: searchQuery.trim(),
    sort: params.sort,
    order: params.direction || 'desc',
    per_page: '100',
    page: params.page?.toString() || '1'
  });

  const response = await api.get(`https://api.github.com/search/issues?${queryParams}`, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  if (!response.data) {
    throw new Error('No data received from API');
  }

  const result = {
    issues: response.data.items.map(transformIssue),
    totalCount: response.data.total_count,
    hasMore: response.data.total_count > (params.page || 1) * 100,
    currentPage: parseInt(params.page?.toString() || '1')
  };

  localStorage.setItem(cacheKey, JSON.stringify({
    data: result,
    timestamp: Date.now()
  }));

  return result;
};

export const getRepositoryDetails = async (owner: string, repo: string) => {
  const { data } = await api.get(`/api/repos/${owner}/${repo}`);
  return data;
};

export const getTopContributors = async (owner: string, repo: string) => {
  const { data } = await api.get(`/api/repos/${owner}/${repo}/contributors/stats`);
  return data;
};

export const getLotteryContributors = async (owner: string, repo: string) => {
  const { data } = await api.get(`/api/repos/${owner}/${repo}/lottery-contributors`);
  return data;
};

export const getContributorConfidence = async (owner: string, repo: string) => {
  const { data } = await api.get(`/api/repos/${owner}/${repo}/contributor-confidence`);
  return data;
};

export const getRepositoryPullRequests = async (
  owner: string, 
  repo: string, 
  state: 'open' | 'closed', 
  page: number = 1,
  includeDetails: boolean = true
) => {
  const params = new URLSearchParams({
    state,
    page: page.toString(),
    includeDetails: includeDetails.toString()
  });
  
  const { data } = await api.get(`/api/repos/${owner}/${repo}/pulls?${params}`);
  return data;
};

export const getPullRequestDetails = async (owner: string, repo: string, pullNumber: number) => {
  const { data } = await api.get(`/api/repos/${owner}/${repo}/pulls/${pullNumber}`);
  return data;
};

export const searchTopContributors = async (query: string, page: number = 1): Promise<{users: GithubUser[], hasMore: boolean}> => {
  const perPage = 10;
  const response = await fetch(
    `https://api.github.com/search/users?q=${query}+type:user&sort=followers&order=desc&page=${page}&per_page=${perPage}`,
    {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch contributors');
  }

  const data = await response.json();
  return {
    users: data.items,
    hasMore: data.total_count > page * perPage
  };
};

export const getUserRepositories = async (page: number, perPage: number) => {
  const response = await fetch(
    `https://api.github.com/user/repos?sort=updated&per_page=${perPage}&page=${page}`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        Accept: 'application/vnd.github.v3+json'
      },
    }
  );
  return response.json();
};

export const getUserActivities = async (username: string) => {
  const response = await fetch(`https://api.github.com/users/${username}/events/public`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/vnd.github.v3+json'
    },
  });
  return response.json();
};

export const getUserStarredCount = async () => {
  const response = await fetch(`https://api.github.com/user/starred?per_page=1`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/vnd.github.v3+json'
    },
  });
  const links = response.headers.get('link');
  const match = links?.match(/page=(\d+)>; rel="last"/);
  return match ? parseInt(match[1]) : 0;
}; 