export interface User {
  login: string;
  id: number;
  avatar_url: string;
  name: string | null;
  email: string | null;
  bio: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  company: string | null;
  location: string | null;
  blog: string | null;
  twitter_username: string | null;
  created_at: string;
  hireable: boolean | null;
}
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  restored: boolean;
}
export interface LoginResponse {
  user: User;
}