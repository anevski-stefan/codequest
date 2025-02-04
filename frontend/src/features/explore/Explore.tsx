import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import axios from 'axios';
import { Search, Users } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import LoadingSpinner from '../../components/LoadingSpinner';
import { searchTopContributors } from '../../services/github';
import type { GithubUser } from '../../types/github';

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

const ContributorsList = ({ 
  contributors, 
  onLoadMore, 
  hasMore, 
  isLoading 
}: { 
  contributors: GithubUser[],
  onLoadMore: () => void,
  hasMore: boolean,
  isLoading: boolean
}) => {
  const navigate = useNavigate();
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contributors.map((user) => (
          <div
            key={user.id}
            onClick={() => navigate(`/contributors/${user.login}`)}
            className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center space-x-4">
              <img src={user.avatar_url} alt="" className="w-12 h-12 rounded-full" />
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">{user.login}</h3>
                <p className="text-xs text-gray-500">{user.public_repos} repositories</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {hasMore && (
        <div className="flex justify-center mt-6">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
};

const Explore = () => {
  const navigate = useNavigate();
  usePageTitle('Explore');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showContributors, setShowContributors] = useState(false);
  const [contributorQuery, setContributorQuery] = useState('');
  const [contributorsPage, setContributorsPage] = useState(1);
  const [allContributors, setAllContributors] = useState<GithubUser[]>([]);

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

  const { data: contributorsData, isLoading: contributorsLoading } = useQuery(
    ['contributors', contributorQuery, contributorsPage],
    () => searchTopContributors(contributorQuery || 'followers:>1000', contributorsPage),
    {
      enabled: showContributors,
      onSuccess: (data) => {
        if (contributorsPage === 1) {
          setAllContributors(data.users);
        } else {
          setAllContributors(prev => [...prev, ...data.users]);
        }
      }
    }
  );

  useEffect(() => {
    setContributorsPage(1);
    setAllContributors([]);
  }, [contributorQuery]);

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

  const handleLoadMoreContributors = () => {
    setContributorsPage(prev => prev + 1);
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-48px)]">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Explore <span className="text-orange-500">Open Source</span>
          </h1>
          
          <div className="max-w-2xl mx-auto relative mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search repositories..."
              className="w-full px-4 py-3 pl-12 text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
          </div>

          <button
            onClick={() => setShowContributors(!showContributors)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Users className="w-5 h-5 mr-2" />
            {showContributors ? 'Hide Contributors' : 'Show Contributors'}
          </button>

          {showContributors && (
            <div className="max-w-2xl mx-auto relative mt-4">
              <input
                type="text"
                value={contributorQuery}
                onChange={(e) => setContributorQuery(e.target.value)}
                placeholder="Search contributors..."
                className="w-full px-4 py-3 pl-12 text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <Users className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
            </div>
          )}
        </div>

        {showContributors && (
          <>
            {contributorsLoading && contributorsPage === 1 && <LoadingSpinner />}
            {allContributors.length > 0 && (
              <ContributorsList 
                contributors={allContributors}
                onLoadMore={handleLoadMoreContributors}
                hasMore={!!contributorsData?.hasMore}
                isLoading={contributorsLoading}
              />
            )}
          </>
        )}

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
    </div>
  );
};

export default Explore; 