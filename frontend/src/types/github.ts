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
  repoStars?: number;
}
export interface IssueResponse {
  issues: Issue[];
  totalCount: number;
  currentPage: number;
  hasMore: boolean;
}
export type Language = '' | 'javascript' | 'typescript' | 'python' | 'java' | 'php' | 'ruby' | 'go' | 'rust' | 'c' | 'cpp' | 'csharp' | 'swift' | 'kotlin' | 'dart' | 'scala' | 'r' | 'elixir' | 'haskell' | 'clojure' | 'erlang' | 'julia' | 'matlab' | 'shell' | 'powershell' | 'html' | 'css' | 'vue' | 'svelte' | 'angular' | 'react' | 'elm' | 'ocaml' | 'fsharp' | 'fortran' | 'cobol' | 'pascal' | 'prolog' | 'scheme' | 'groovy' | 'objective-c' | 'verilog' | 'vhdl' | 'solidity' | 'crystal' | 'nim' | 'zig' | 'lua' | 'perl' | 'assembly';
export interface IssueParams {
  language: string;
  sort: string;
  direction?: 'asc' | 'desc';
  state: 'open' | 'closed';
  page: number;
  timeFrame: string;
  unassigned: boolean;
  commentsRange: string;
  labels: string[];
}
export interface ActivityPayload {
  action?: string;
  ref?: string;
  ref_type?: string;
  master_branch?: string;
  description?: string;
  pusher_type?: string;
  push_id?: number;
  size?: number;
  distinct_size?: number;
  head?: string;
  before?: string;
  commits?: Array<{
    sha: string;
    message: string;
    author: {
      name: string;
      email: string;
    };
    url: string;
    distinct: boolean;
  }>;
}
export interface Activity {
  id: string;
  type: string;
  repo: string;
  date: string;
  payload: ActivityPayload;
}
export interface GithubUser {
  id: number;
  login: string;
  avatar_url: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  contributions?: number;
  company: string | null;
  location: string | null;
  blog: string | null;
  twitter_username: string | null;
  created_at: string;
  hireable: boolean | null;
}
export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
}

export interface GitHubRepository {
  id: number;
  full_name: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  language: string;
  html_url: string;
  default_branch: string;
  open_issues_count: number;
  topics: string[];
  updated_at: string;
  license: { name: string } | null;
  owner: { avatar_url: string; login: string };
}
export interface GitHubActivityActor {
  login: string;
  avatar_url: string;
}
export interface PullRequestFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export interface PullRequestDetails {
  number: number;
  title: string;
  state: string;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  closed_at: string | null;
  user: { login: string; avatar_url: string };
  files: PullRequestFile[];
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
  comments: number;
  review_comments: number;
  commits_data: {
    sha: string;
    commit: { message: string; author: { name: string; email: string; date: string } };
    author: { login: string; avatar_url: string } | null;
    files: string[];
  }[];
}

export interface GitHubActivityEvent {
  id: string;
  type: string;
  actor: GitHubActivityActor;
  repo: {
    name: string;
  };
  created_at: string;
  payload: ActivityPayload;
}
export type ClaimStatus = 'free' | 'requested' | 'in_progress' | 'stale' | 'closed' | 'unknown';
export interface IssueClaim {
  status: ClaimStatus;
  reason: string;
  since?: string | null;
  claimant?: string;
  pr?: { number: number; url: string; author?: string; draft: boolean };
}
