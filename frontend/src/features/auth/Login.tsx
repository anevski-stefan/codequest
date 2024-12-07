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
    <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-4 sm:mb-6 text-center">
            Launch Your Developer Journey
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-6 sm:mb-8 text-center leading-relaxed">
            Whether you're a student seeking internships or a contributor looking to make an impact, 
            we help you discover the perfect issues to kickstart your open-source journey. Track your 
            progress, showcase your contributions, and connect with projects that match your skills.
          </p>
          <button
            onClick={handleGitHubLogin}
            className="w-full bg-gray-800 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 text-white font-bold py-2.5 sm:py-3 px-4 rounded-lg transition duration-300 ease-in-out flex items-center justify-center text-sm sm:text-base"
          >
            <Github className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            Sign in with GitHub
          </button> 
        </div>
      </div>
    </div>
  );
};

export default Login; 