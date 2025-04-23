export interface User {
  login: string;
  id: number;
  avatar_url: string;
  name: string;
  email: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  expiresAt: string | null;
}

export interface LoginResponse {
  user: User;
  token: string;
  expiresAt: string;
} 