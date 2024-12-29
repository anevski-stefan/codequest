import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import axios from 'axios';
import { Search } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import LoadingSpinner from '../../components/LoadingSpinner';

interface Repository {
  id: number;
  full_name: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  html_url: string;
  owner: {
    avatar_url: string;
  };
}

const Explore = () => {
  const navigate = useNavigate();
  usePageTitle('Explore');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const { data, isLoading, error } = useQuery(
    ['repositories', debouncedQuery],
    async () => {
      if (!debouncedQuery) return null;
      const response = await axios.get(`https://api.github.com/search/repositories?q=${debouncedQuery}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      return response.data;
    },
    {
      enabled: !!debouncedQuery,
    }
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setTimeout(() => {
      setDebouncedQuery(e.target.value);
    }, 500);
  };

  const handleRepositoryClick = (fullName: string) => {
    const [owner, repo] = fullName.split('/');
    navigate(`/explore/${owner}/${repo}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Explore <span className="text-orange-500">Open Source</span>
        </h1>
        <div className="max-w-2xl mx-auto relative">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search repositories..."
            className="w-full px-4 py-3 pl-12 text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
          <div className="absolute right-4 top-3 text-xs text-gray-400">
            CTRL+K
          </div>
        </div>
      </div>

      {isLoading && <LoadingSpinner />}

      {error && (
        <div className="text-center text-red-600 dark:text-red-400">
          An error occurred while fetching repositories
        </div>
      )}

      {data?.items && (
        <div className="grid gap-6">
          {data.items.map((repo: Repository) => (
            <div 
              key={repo.id} 
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleRepositoryClick(repo.full_name)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                      {repo.full_name}
                    </a>
                  </h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">{repo.description}</p>
                  <div className="mt-4 flex items-center space-x-4">
                    {repo.language && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {repo.language}
                      </span>
                    )}
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ★ {repo.stargazers_count.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      🍴 {repo.forks_count.toLocaleString()}
                    </span>
                  </div>
                </div>
                <img
                  src={repo.owner.avatar_url}
                  alt=""
                  className="w-12 h-12 rounded-full"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Explore; 