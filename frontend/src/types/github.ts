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