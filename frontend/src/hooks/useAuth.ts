import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setCredentials, logout } from '../features/auth/authSlice';
import type { RootState } from '../store';
import type { LoginResponse } from '../types/auth';

export const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const auth = useSelector((state: RootState) => state.auth);

  const login = (userData: LoginResponse) => {
    console.log('Login called with:', userData);
    localStorage.setItem('token', userData.token);
    dispatch(setCredentials(userData));
  };

  const logoutUser = () => {
    localStorage.removeItem('token');
    dispatch(logout());
    navigate('/');
  };

  return {
    ...auth,
    login,
    logout: logoutUser,
  };
};

export default useAuth; 