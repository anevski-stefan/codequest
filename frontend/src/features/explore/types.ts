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

/** Outside (non-maintainer, non-bot) pull requests; see mergeLikelihoodService. */
export interface MergeLikelihood {
  likelihood: 'high' | 'medium' | 'low' | 'unknown';
  merge_rate: number | null;          // 0–100
  median_days_to_merge: number | null;
  sample_size: number;
  merged_count: number;
  waiting_count: number;              // open 30+ days, counted as not merged
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

export const BAR_COLORS = ['#60A5FA', '#F59E0B', '#34D399', '#F87171', '#94A3B8'];
