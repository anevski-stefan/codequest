import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import axios from 'axios';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const token = searchParams.get('token');
        console.log('Received token:', token);
        
        if (!token) {
          throw new Error('No token received');
        }

        // Fetch user data from GitHub API
        const response = await axios.get('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        // Now we have the user data, call login with both token and user
        login({
          token,
          user: response.data
        });

        navigate('/dashboard');
      } catch (error) {
        console.error('Detailed auth error:', error);
        navigate('/login');
      }
    };

    handleCallback();
  }, [searchParams, login, navigate]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-inherit">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  );
};

export default AuthCallback; 