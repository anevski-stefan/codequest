export interface User {
  login: string;
  id: number;
  avatar_url: string;
  name: string;
  email: string;
}
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  restored: boolean;
}
export interface LoginResponse {
  user: User;
}