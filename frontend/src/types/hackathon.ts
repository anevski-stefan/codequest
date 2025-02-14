export interface Hackathon {
  url: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  source: string;
  location?: string;
  prize?: string;
  participantCount?: number;
  tags: string[];
}

export interface HackathonResponse {
  hackathons: Hackathon[];
  totalPages: number;
  currentPage: number;
  totalHackathons: number;
  isLoading: boolean;
}
