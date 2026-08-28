import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { usePageTitle } from '../../hooks/usePageTitle';
import { api } from '../../services/github';
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
        navigate('/dashboard');
      } catch (error) {
        console.error('Detailed auth error:', error);
        navigate('/');
      }
    };
    handleCallback();
  }, [login, navigate]);
  return null;
};
export default AuthCallback;