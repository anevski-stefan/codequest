import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import type { AuthState } from '../types/auth';

// Define the root state type
interface RootState {
  auth: AuthState;
}

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

// Export the RootState type
export type { RootState };
export type AppDispatch = typeof store.dispatch; 