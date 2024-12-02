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
}

export interface LoginResponse {
  user: User;
  token: string;
} 