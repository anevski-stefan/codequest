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

export const getIssues = async (params: IssueParams = {
  language: '',
  sort: 'created',
  state: 'open',
  page: 1
}): Promise<IssueResponse> => {
  const { data } = await api.get('/api/issues', { params });
  return data;
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