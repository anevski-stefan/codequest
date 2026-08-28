import type { HackathonResponse } from '../types/hackathon';
import { api } from './github';
export async function fetchHackathons(page: number, limit: number, search?: string, filter: string = 'all'): Promise<HackathonResponse> {
  console.log('Fetching hackathons with params:', {
    page,
    limit,
    search,
    filter
  });
  const response = await api.get('/api/hackathons', {
    params: {
      page,
      limit,
      search,
      filter
    },
    timeout: 10000,
    withCredentials: true
  });
  console.log('Response from backend:', response.data);
  return response.data;
}