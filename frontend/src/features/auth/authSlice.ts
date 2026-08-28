import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AuthState, LoginResponse } from '../../types/auth';
const getInitialState = (): AuthState => ({
  isAuthenticated: false,
  user: null,
  restored: false
});
const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialState(),
  reducers: {
    setCredentials: (state, action: PayloadAction<LoginResponse>) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.restored = true;
    },
    logout: state => {
      state.isAuthenticated = false;
      state.user = null;
      state.restored = true;
    },
    finishRestore: state => {
      state.restored = true;
    }
  }
});
export const {
  setCredentials,
  logout,
  finishRestore
} = authSlice.actions;
export default authSlice.reducer;