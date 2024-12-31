import axios from 'axios';
import type { Hackathon } from '../types/hackathon';

interface HackathonResponse {
  hackathons: Hackathon[];
  totalPages: number;
}

export async function fetchHackathons(page: number, limit: number): Promise<HackathonResponse> {
  const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/hackathons`, {
    params: { page, limit },
    timeout: 10000,
    withCredentials: true
  });
  
  return response.data;
} 