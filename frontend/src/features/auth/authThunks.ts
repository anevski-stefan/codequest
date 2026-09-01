import { api } from '../../services/github';
import { setCredentials, finishRestore } from './authSlice';
import type { AppDispatch } from '../../store';
import type { User } from '../../types/auth';
const isUser = (value: unknown): value is User => typeof value === 'object' && value !== null && typeof (value as { login?: unknown }).login === 'string';
export const restoreSession = () => async (dispatch: AppDispatch): Promise<void> => {
  try {
    const response = await api.get('/auth/me');
    if (isUser(response.data?.user)) {
      dispatch(setCredentials({
        user: response.data.user
      }));
    } else {
      dispatch(finishRestore());
    }
  } catch {
    dispatch(finishRestore());
  }
};