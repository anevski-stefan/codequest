import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import axios from 'axios';
import LoadingSpinner from '../../components/LoadingSpinner';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const token = searchParams.get('token');
        
        if (!token) {
          throw new Error('No token received');
        }

        // Fetch user data from GitHub API
        const response = await axios.get('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        // Calculate expiration (30 minutes from now)
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

        // Now we have the user data, call login with token, user, and expiration
        login({
          token,
          user: response.data,
          expiresAt
        });

        navigate('/dashboard');
      } catch (error) {
        console.error('Detailed auth error:', error);
        navigate('/');
      }
    };

    handleCallback();
  }, [searchParams, login, navigate]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-inherit">
      <LoadingSpinner />
    </div>
  );
};

export default AuthCallback; 