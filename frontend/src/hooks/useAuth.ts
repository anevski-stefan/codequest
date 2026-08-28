import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setCredentials, logout } from '../features/auth/authSlice';
import { api } from '../services/github';
import type { RootState } from '../store';
import type { LoginResponse } from '../types/auth';
export const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const auth = useSelector((state: RootState) => state.auth);
  const login = (userData: LoginResponse) => {
    dispatch(setCredentials(userData));
  };
  const logoutUser = async () => {
    try {
      await api.get('/auth/logout');
    } catch {}
    dispatch(logout());
    navigate('/');
  };
  return {
    ...auth,
    login,
    logout: logoutUser
  };
};
export default useAuth;