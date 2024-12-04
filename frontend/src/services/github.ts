import axios from 'axios';
import type { IssueParams, IssueResponse } from '../types/github';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

const etagStore = new Map<string, string>();

api.interceptors.request.use((config) => {
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

export const getIssues = async (params: IssueParams): Promise<IssueResponse> => {
  // Build the base search query
  let searchQuery = 'is:issue '; // Ensure we're only getting issues
  
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
      // Properly encode label names with spaces
      const encodedLabel = label.includes(' ') ? `"${label}"` : label;
      searchQuery += `label:${encodedLabel} `;
    });
  }

  // Add time frame filter
  if (params.timeFrame && params.timeFrame !== 'all') {
    const date = new Date();
    switch (params.timeFrame) {
      case 'day':
        date.setDate(date.getDate() - 1);
        break;
      case 'week':
        date.setDate(date.getDate() - 7);
        break;
      case 'month':
        date.setMonth(date.getMonth() - 1);
        break;
      case 'year':
        date.setFullYear(date.getFullYear() - 1);
        break;
    }
    searchQuery += `created:>=${date.toISOString().split('T')[0]} `;
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
    sort: params.sort || 'created', // Default to created
    order: 'desc', // Always show newest first
    per_page: '30',
    page: params.page?.toString() || '1'
  });

  try {
    console.log('Search query:', searchQuery);
    
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
    
    // Transform the response data to match our types
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
      hasMore: transformedIssues.length === 30,
      currentPage: parseInt(params.page?.toString() || '1')
    };
  } catch (error) {
    console.error('Failed to fetch issues:', error);
    throw error;
  }
};

export const getActivity = async () => {
  const { data } = await api.get('/api/activity');
  return data;
};

export const getIssueComments = async (issueNumber: number, repoFullName: string, page = 1) => {
  try {
    const [owner, repo] = repoFullName.split('/');
    console.log('Fetching comments for:', { issueNumber, owner, repo, page });

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

    console.log('Comment created:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

export const getAssignedIssues = async (): Promise<IssueResponse> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/issues/assigned`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      issues: data.issues,
      totalCount: data.totalCount,
      hasMore: false,
      currentPage: 1
    };
  } catch (error) {
    console.error('Failed to fetch assigned issues:', error);
    throw error;
  }
}; 