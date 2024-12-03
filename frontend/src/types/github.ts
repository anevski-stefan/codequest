export interface Label {
  name: string;
  color: string;
}

export interface Repository {
  id: string;
  fullName: string;
  url: string;
}

export interface User {
  login: string;
  avatarUrl: string;
}

export interface Issue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  createdAt: string;
  updatedAt: string;
  commentsCount: number;
  labels: Label[];
  repository: Repository;
  user: User;
  url: string;
}

export interface IssueResponse {
  issues: Issue[];
  totalCount: number;
  currentPage: number;
  hasMore: boolean;
}

export type Language = 
  | ''
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'go'
  | 'rust'
  | 'cpp'
  | 'ruby'
  | 'php';

export interface IssueParams {
  language: Language;
  sort: 'created' | 'updated' | 'comments' | 'oldest' | 'newest';
  state: 'open' | 'closed';
  page: number;
  timeFrame?: 'day' | 'week' | 'month' | 'year' | 'all';
  unassigned?: boolean;
}

export interface Activity {
  id: string;
  type: string;
  repo: string;
  date: string;
  payload: any;
}

export interface Comment {
  id: number;
  body: string;
  user: {
    login: string;
    avatarUrl: string;
  };
  createdAt: string;
} 