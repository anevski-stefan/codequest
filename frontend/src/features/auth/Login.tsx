import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Github } from 'lucide-react';
import type { RootState } from '../../store';
import NewsletterForm from '../../components/NewsletterForm';
import { usePageTitle } from '../../hooks/usePageTitle';

const Login = () => {
  usePageTitle('Login');
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
    <div className="relative min-h-screen w-full bg-white dark:bg-gradient-to-br dark:from-gray-950 dark:via-[#0B1222] dark:to-gray-900">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 px-8 py-5 bg-white/80 dark:bg-transparent backdrop-blur-lg border-b border-gray-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => navigate('/')} 
            className="text-xl font-bold text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
          >
            Code Quest
          </button>
          <a href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
            Need help?
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative w-full min-h-screen flex items-center justify-center pt-20 pb-8">
        <div className="flex flex-col lg:grid lg:grid-cols-2 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 gap-8">
          {/* Left Column - Main Content */}
          <div className="flex flex-col items-start justify-center lg:items-center lg:border-r border-gray-200 dark:border-white/10">
            <div className="space-y-12 w-full max-w-md">
              <div className="space-y-4 sm:space-y-12">
                <div className="space-y-2 sm:space-y-6">
                  {/* Project Matching Banner */}
                  <div className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-50 dark:bg-blue-500/10 rounded-full border border-blue-100 dark:border-blue-500/20">
                    <span className="text-[10px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400">
                      New: Project Matching Available →
                    </span>
                  </div>

                  {/* Hackathons Banner */}
                  <div className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-purple-50 dark:bg-purple-500/10 rounded-full border border-purple-100 dark:border-purple-500/20">
                    <a 
                      href="/hackathons" 
                      className="text-[10px] sm:text-xs font-semibold text-purple-600 dark:text-purple-400"
                    >
                      Looking for Hackathons? Check our Database →
                    </a>
                  </div>
                </div>

                <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
                  Welcome to the community
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                  Join thousands of developers building the future of open source. Find projects and hackathons that match your skills.
                </p>
              </div>

              <button
                onClick={handleGitHubLogin}
                className="w-full group relative flex items-center justify-center px-6 py-4 
                  bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-50 
                  text-white dark:text-gray-900 rounded-lg transition-all duration-200 
                  overflow-hidden shadow-sm hover:shadow-md"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-violet-500/10 opacity-0 
                  group-hover:opacity-100 transition-opacity duration-300" />
                <Github className="w-5 h-5 mr-3" />
                <span className="text-base font-medium">Continue with GitHub</span>
              </button>
            </div>
          </div>

          {/* Right Column - Newsletter */}
          <div className="flex flex-col items-start justify-center lg:items-center mt-8 lg:mt-0">
            <div className="w-full max-w-md">
              <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-8 border border-gray-200 
                dark:border-white/10 dark:backdrop-blur-xl">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                      Stay in the loop
                    </h3>
                    <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
                      Get weekly updates on new features, community highlights, and upcoming events
                    </p>
                  </div>
                  <NewsletterForm />
                  <p className="text-sm text-gray-500">
                    By subscribing, you agree to our privacy policy and terms of service.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 