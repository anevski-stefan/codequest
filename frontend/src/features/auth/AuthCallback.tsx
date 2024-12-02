import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

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

        login({
          token,
          user: null 
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
    <div className="flex justify-center items-center h-screen">
      <div className="text-center">
        <h2 className="text-xl mb-4">Completing authentication...</h2>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
      </div>
    </div>
  );
};

export default AuthCallback; 