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
  | 'php'
  | 'ruby'
  | 'go'
  | 'rust'
  | 'c'
  | 'cpp'
  | 'csharp'
  | 'swift'
  | 'kotlin'
  | 'dart'
  | 'scala'
  | 'r'
  | 'elixir'
  | 'haskell'
  | 'clojure'
  | 'erlang'
  | 'julia'
  | 'matlab'
  | 'shell'
  | 'powershell'
  | 'html'
  | 'css'
  | 'vue'
  | 'svelte'
  | 'angular'
  | 'react'
  | 'elm'
  | 'ocaml'
  | 'fsharp'
  | 'fortran'
  | 'cobol'
  | 'pascal'
  | 'prolog'
  | 'scheme'
  | 'groovy'
  | 'objective-c'
  | 'verilog'
  | 'vhdl'
  | 'solidity'
  | 'crystal'
  | 'nim'
  | 'zig'
  | 'lua'
  | 'perl'
  | 'assembly';

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

export interface Comment {
  id: number;
  body: string;
  user: {
    login: string;
    avatarUrl: string;
  };
  createdAt: string;
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