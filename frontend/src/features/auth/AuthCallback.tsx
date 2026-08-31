import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { usePageTitle } from '../../hooks/usePageTitle';
import { api } from '../../services/github';
const AUTH_REDIRECT_KEY = 'auth_redirect';
const AuthCallback = () => {
  usePageTitle('Authenticating');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    login
  } = useAuth();
  useEffect(() => {
    const handleCallback = async () => {
      const oauthError = searchParams.get('error');
      if (oauthError) {
        const description = searchParams.get('error_description') || searchParams.get('errorDescription');
        sessionStorage.removeItem(AUTH_REDIRECT_KEY);
        navigate('/login', {
          state: {
            authError: description || oauthError
          }
        });
        return;
      }
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
  }, [login, navigate, searchParams]);
  return null;
};
export default AuthCallback;