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