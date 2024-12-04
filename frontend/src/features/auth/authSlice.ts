import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AuthState, LoginResponse } from '../../types/auth';

const getInitialState = (): AuthState => {
  const savedAuth = localStorage.getItem('auth');
  if (savedAuth) {
    const auth = JSON.parse(savedAuth);
    // Check if session is expired
    if (auth.expiresAt && new Date(auth.expiresAt) > new Date()) {
      return auth;
    }
    // Clear expired session
    localStorage.removeItem('auth');
  }
  return {
    isAuthenticated: false,
    token: null,
    user: null,
    expiresAt: null
  };
};

const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialState(),
  reducers: {
    setCredentials: (state, action: PayloadAction<LoginResponse>) => {
      state.isAuthenticated = true;
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.expiresAt = action.payload.expiresAt;
      localStorage.setItem('auth', JSON.stringify(state));
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.token = null;
      state.user = null;
      state.expiresAt = null;
      localStorage.removeItem('auth');
    }
  }
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer; 