export interface Hackathon {
  title: string;
  description: string;
  url: string;
  startDate: string;
  location?: string;
  prize?: string;
  tags: string[];
  source: string;
}

export interface HackathonResponse {
  hackathons: Hackathon[];
  totalPages: number;
}
