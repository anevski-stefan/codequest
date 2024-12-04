import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Github } from 'lucide-react';
import type { RootState } from '../../store';

const Login = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleGitHubLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/github`;
  };

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
      <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          Launch Your Developer Journey
        </h1>
        <p className="text-gray-600 mb-8 text-center">
          Whether you're a student seeking internships or a contributor looking to make an impact, 
          we help you discover the perfect issues to kickstart your open-source journey. Track your 
          progress, showcase your contributions, and connect with projects that match your skills.
        </p>
        <button
          onClick={handleGitHubLogin}
          className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out flex items-center justify-center"
        >
          <Github className="mr-2 h-5 w-5" />
          Sign in with GitHub
        </button>
      </div>
    </div>
  );
};

export default Login; 