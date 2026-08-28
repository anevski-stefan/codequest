import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AuthState, LoginResponse } from '../../types/auth';
const getInitialState = (): AuthState => ({
  isAuthenticated: false,
  token: null,
  user: null,
  expiresAt: null
});
const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialState(),
  reducers: {
    setCredentials: (state, action: PayloadAction<LoginResponse>) => {
      state.isAuthenticated = true;
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.expiresAt = action.payload.expiresAt;
    },
    logout: state => {
      state.isAuthenticated = false;
      state.token = null;
      state.user = null;
      state.expiresAt = null;
    }
  }
});
export const {
  setCredentials,
  logout
} = authSlice.actions;
export default authSlice.reducer;