import type { HackathonResponse } from '../types/hackathon';
import { api } from './github';
export async function fetchHackathons(page: number, limit: number, search?: string, filter: string = 'all'): Promise<HackathonResponse> {
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
    return response.data;
}