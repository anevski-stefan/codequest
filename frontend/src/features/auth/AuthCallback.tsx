import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { usePageTitle } from '../../hooks/usePageTitle';
import { api } from '../../services/github';
const AUTH_REDIRECT_KEY = 'auth_redirect';
const AuthCallback = () => {
  usePageTitle('Authenticating');
  const navigate = useNavigate();
  const {
    login
  } = useAuth();
  useEffect(() => {
    const handleCallback = async () => {
      try {
        const {
          data
        } = await api.get('/auth/me');
        if (!data?.user) {
          throw new Error('No user received');
        }
        login({
          user: data.user
        });
        const saved = sessionStorage.getItem(AUTH_REDIRECT_KEY);
        sessionStorage.removeItem(AUTH_REDIRECT_KEY);
        const target = saved && saved.startsWith('/') && !saved.startsWith('//') ? saved : '/dashboard';
        navigate(target);
      } catch (error) {
        console.error('Detailed auth error:', error);
        sessionStorage.removeItem(AUTH_REDIRECT_KEY);
        navigate('/');
      }
    };
    handleCallback();
  }, [login, navigate]);
  return null;
};
export default AuthCallback;