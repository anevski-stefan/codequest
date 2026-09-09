export interface TopContributor {
  login: string;
  avatar_url: string;
  contributions: number;
  percentage: number;
}

export interface LotteryContributor {
  login: string;
  avatar_url: string;
  pull_requests: number;
  percentage: number;
}

export interface ContributorConfidence {
  percentage: number;
  message: string;
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  draft: boolean;
  user: { login: string; avatar_url: string };
  labels: Array<{ name: string; color: string }>;
  requested_reviewers: Array<{ login: string; avatar_url: string }>;
  head: { ref: string; sha: string };
  base: { ref: string };
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
  comments: number;
  review_comments: number;
}

export type PullRequestsResult = {
  pullRequests: PullRequest[];
  hasMore: boolean;
  totalCount: number;
};

export interface PullRequestCounts {
  open: number;
  closed: number;
}

export const BAR_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];
