import axios from 'axios';
import type { IssueParams, IssueResponse } from '../types/github';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }
  return config;
});

export const getIssues = async (params: IssueParams): Promise<IssueResponse> => {
  const queryParams = new URLSearchParams();
  
  // Add existing params
  if (params.language) queryParams.append('language', params.language);
  if (params.sort) queryParams.append('sort', params.sort);
  if (params.state) queryParams.append('state', params.state);
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.timeFrame) queryParams.append('timeFrame', params.timeFrame);
  
  // Only add unassigned parameter if it's true
  if (params.unassigned === true) {
    queryParams.append('assignee', 'none');
  }

  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/issues?${queryParams}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
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