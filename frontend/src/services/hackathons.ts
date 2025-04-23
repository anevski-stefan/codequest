import axios from 'axios';
import type { HackathonResponse } from '../types/hackathon';

export async function fetchHackathons(
  page: number, 
  limit: number, 
  search?: string,
  filter: string = 'all'
): Promise<HackathonResponse> {
  console.log('Fetching hackathons with params:', { page, limit, search, filter });
  
  const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/hackathons`, {
    params: { page, limit, search, filter },
    timeout: 10000,
    withCredentials: true
  });
  
  console.log('Response from backend:', response.data);
  return response.data;
} 