import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from 'react-query';
import { 
  Star, 
  GitFork, 
  Calendar,
  MapPin,
  Link as LinkIcon,
  Building,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import LoadingSpinner from '../../components/LoadingSpinner';
import type { RootState } from '../../store';
import type { GithubUser } from '../../types/github';
import { usePageTitle } from '../../hooks/usePageTitle';
import { getUserRepositories, getUserActivities, getUserStarredCount } from '../../services/github';

const Profile = () => {
  usePageTitle('Profile');
  const { user } = useSelector((state: RootState) => state.auth) as { user: GithubUser | null };
  const [activeTab, setActiveTab] = useState<'overview' | 'repositories'>('overview');
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const { data: repos, isLoading: reposLoading } = useQuery(
    ['user-repos', page],
    () => getUserRepositories(page, PER_PAGE)
  );

  const { data: activities, isLoading: activitiesLoading } = useQuery(
    ['user-activities'],
    () => getUserActivities(user?.login as string),
    {
      enabled: !!user?.login
    }
  );

  const { data: starredCount } = useQuery(
    ['user-starred'],
    getUserStarredCount
  );

  const Pagination = () => (
    <div className="mt-6 flex items-center justify-center gap-4">
      <button
        onClick={() => setPage(p => Math.max(1, p - 1))}
        disabled={page === 1}
        className={`p-2 rounded-lg ${
          page === 1
            ? 'text-gray-400 cursor-not-allowed'
            : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <span className="text-sm text-gray-600 dark:text-gray-300">
        Page {page}
      </span>
      <button
        onClick={() => setPage(p => p + 1)}
        disabled={!repos || repos.length < PER_PAGE}
        className={`p-2 rounded-lg ${
          !repos || repos.length < PER_PAGE
            ? 'text-gray-400 cursor-not-allowed'
            : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );

  const formatActivityMessage = (event: any) => {
    switch (event.type) {
      case 'PushEvent':
        return 'pushed to';
      case 'CreateEvent':
        return `created ${event.payload.ref_type}`;
      case 'IssuesEvent':
        return `${event.payload.action} issue in`;
      case 'PullRequestEvent':
        return `${event.payload.action} pull request in`;
      case 'ForkEvent':
        return 'forked';
      case 'WatchEvent':
        return 'starred';
      default:
        return 'interacted with';
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col md:flex-row flex-1 dark:bg-[#0B1222] mt-8 gap-6 p-4 md:p-6">
      {/* Sidebar */}
      <div className="md:w-80 shrink-0">
        <div className="sticky top-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#0B1222] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-white/10"
          >
            <div className="flex flex-col items-center">
              <img
                src={user.avatar_url}
                alt={user.name || user.login}
                className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-700 shadow-lg"
              />
              <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
                {user.name}
              </h1>
              <h2 className="text-gray-600 dark:text-gray-400">
                @{user.login}
              </h2>
              
              {user.bio && (
                <p className="mt-4 text-center text-gray-600 dark:text-gray-300">
                  {user.bio}
                </p>
              )}

              <div className="mt-6 flex items-center justify-center space-x-6 text-gray-600 dark:text-gray-300">
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold">{user.followers}</span>
                  <span className="text-sm">Followers</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold">{user.following}</span>
                  <span className="text-sm">Following</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold">{user.public_repos}</span>
                  <span className="text-sm">Repos</span>
                </div>
              </div>

              <div className="mt-6 w-full space-y-3">
                {user.company && (
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <Building className="w-5 h-5 mr-2" />
                    {user.company}
                  </div>
                )}
                {user.location && (
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <MapPin className="w-5 h-5 mr-2" />
                    {user.location}
                  </div>
                )}
                {user.blog && (
                  <div className="flex items-center text-blue-600 dark:text-blue-400">
                    <LinkIcon className="w-5 h-5 mr-2" />
                    <a href={user.blog} target="_blank" rel="noopener noreferrer">
                      {user.blog}
                    </a>
                  </div>
                )}
                {user.twitter_username && (
                  <div className="flex items-center text-blue-400">
                    <X className="w-5 h-5 mr-2" />
                    <a
                      href={`https://twitter.com/${user.twitter_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      @{user.twitter_username}
                    </a>
                  </div>
                )}
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <Calendar className="w-5 h-5 mr-2" />
                  Joined {new Date(user.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-white dark:bg-[#0B1222] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-white/10"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Statistics
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">Starred Repos</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {starredCount || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">Public Gists</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {user?.public_gists || 0}
                </span>
              </div>
              {user?.hireable && (
                <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Available for hire
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="space-y-6">
          {/* Recent Activity Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#0B1222] rounded-xl shadow-sm p-6 border border-gray-200 dark:border-white/10"
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Recent Activity
            </h2>
            {activitiesLoading ? (
              <LoadingSpinner />
            ) : (
              <div className="space-y-4">
                {activities?.slice(0, 10).map((event: any) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <img
                        src={event.actor.avatar_url}
                        alt={event.actor.login}
                        className="w-8 h-8 rounded-full"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white">
                        <span className="font-medium">{event.actor.login}</span>{' '}
                        {formatActivityMessage(event)}{' '}
                        <a
                          href={`https://github.com/${event.repo.name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {event.repo.name}
                        </a>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(event.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Repositories Section */}
          <div className="bg-white dark:bg-[#0B1222] rounded-xl shadow-sm border border-gray-200 dark:border-white/10">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                {(['overview', 'repositories'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`
                      py-4 px-1 border-b-2 font-medium text-sm
                      ${
                        activeTab === tab
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'overview' ? (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Popular Repositories
                  </h3>
                  {reposLoading ? (
                    <LoadingSpinner />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {repos?.slice(0, 6).map((repo: any) => (
                        <motion.a
                          key={repo.id}
                          href={repo.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          whileHover={{ scale: 1.02 }}
                        >
                          <h4 className="text-base font-semibold text-blue-600 dark:text-blue-400">
                            {repo.name}
                          </h4>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            {repo.description || 'No description available'}
                          </p>
                          <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                            {repo.language && (
                              <span className="flex items-center">
                                <span className="w-3 h-3 rounded-full bg-blue-500 mr-1"></span>
                                {repo.language}
                              </span>
                            )}
                            <span className="flex items-center">
                              <Star className="w-4 h-4 mr-1" />
                              {repo.stargazers_count}
                            </span>
                            <span className="flex items-center">
                              <GitFork className="w-4 h-4 mr-1" />
                              {repo.forks_count}
                            </span>
                          </div>
                        </motion.a>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {reposLoading ? (
                    <LoadingSpinner />
                  ) : (
                    <>
                      {repos?.map((repo: any) => (
                        <motion.div
                          key={repo.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                        >
                          <h4 className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                            <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                              {repo.name}
                            </a>
                          </h4>
                          <p className="mt-2 text-gray-600 dark:text-gray-300">
                            {repo.description || 'No description available'}
                          </p>
                          <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                            {repo.language && (
                              <span className="flex items-center">
                                <span className="w-3 h-3 rounded-full bg-blue-500 mr-1"></span>
                                {repo.language}
                              </span>
                            )}
                            <span className="flex items-center">
                              <Star className="w-4 h-4 mr-1" />
                              {repo.stargazers_count}
                            </span>
                            <span className="flex items-center">
                              <GitFork className="w-4 h-4 mr-1" />
                              {repo.forks_count}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                      <Pagination />
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 