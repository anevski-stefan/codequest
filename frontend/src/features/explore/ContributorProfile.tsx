import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from 'react-query';
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
import LoadingSpinner from '../../components/LoadingSpinner';
import { motion } from 'framer-motion';
import StatsModal from '../../components/StatsModal';
import { ProfileSkeleton } from '../../components/skeletons';

interface ContributorDetails {
  login: string;
  name: string;
  avatar_url: string;
  bio: string;
  location: string;
  blog: string;
  twitter_username: string;
  company: string;
  followers: number;
  following: number;
  public_repos: number;
  created_at: string;
  public_gists: number;
  hireable: boolean;
  email: string;
  organizations_url: string;
  starred_url: string;
  total_private_repos?: number;
  owned_private_repos?: number;
}

interface Repository {
  id: number;
  name: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  html_url: string;
}

interface ActivityEvent {
  id: string;
  type: string;
  created_at: string;
  repo: {
    name: string;
    url: string;
  };
  payload: {
    action?: string;
    ref_type?: string;
    ref?: string;
    description?: string;
  };
}

const formatUrl = (url: string) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `https://${url}`;
};

const ContributorProfile = () => {
  const { username } = useParams<{ username: string }>();
  const [activeTab, setActiveTab] = useState<'overview' | 'repositories'>('overview');
  const [page, setPage] = useState(1);
  const PER_PAGE = 30;
  const [activeModal, setActiveModal] = useState<'followers' | 'following' | 'repos' | null>(null);

  const { data: user, isLoading: userLoading } = useQuery<ContributorDetails>(
    ['contributor', username],
    async () => {
      const response = await fetch(`https://api.github.com/users/${username}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      return response.json();
    }
  );

  const { data: organizations } = useQuery(
    ['contributor-orgs', username],
    async () => {
      const response = await fetch(`https://api.github.com/users/${username}/orgs`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      return response.json();
    }
  );

  const { data: starredRepos } = useQuery(
    ['contributor-starred', username],
    async () => {
      const response = await fetch(`https://api.github.com/users/${username}/starred?per_page=1`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const links = response.headers.get('link');
      const match = links?.match(/page=(\d+)>; rel="last"/);
      return match ? parseInt(match[1]) : 0;
    }
  );

  const { data: activityEvents, isLoading: activitiesLoading } = useQuery<ActivityEvent[]>(
    ['contributor-activity', username],
    async () => {
      const response = await fetch(`https://api.github.com/users/${username}/events/public`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      return response.json();
    }
  );

  const { 
    data: followers, 
    isLoading: followersLoading, 
    isFetchingNextPage: isLoadingMoreFollowers, 
    fetchNextPage: fetchMoreFollowers, 
    hasNextPage: hasMoreFollowers 
  } = useInfiniteQuery(
    ['contributor-followers', username],
    async ({ pageParam = 1 }) => {
      const response = await fetch(
        `https://api.github.com/users/${username}/followers?per_page=${PER_PAGE}&page=${pageParam}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      const data = await response.json();
      return {
        data,
        nextPage: data.length === PER_PAGE ? pageParam + 1 : undefined,
      };
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextPage,
      enabled: activeModal === 'followers',
    }
  );

  const { 
    data: following, 
    isLoading: followingLoading, 
    isFetchingNextPage: isLoadingMoreFollowing, 
    fetchNextPage: fetchMoreFollowing, 
    hasNextPage: hasMoreFollowing 
  } = useInfiniteQuery(
    ['contributor-following', username],
    async ({ pageParam = 1 }) => {
      const response = await fetch(
        `https://api.github.com/users/${username}/following?per_page=${PER_PAGE}&page=${pageParam}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      const data = await response.json();
      return {
        data,
        nextPage: data.length === PER_PAGE ? pageParam + 1 : undefined,
      };
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextPage,
      enabled: activeModal === 'following',
    }
  );

  const { data: repos, isLoading: reposLoading } = useQuery<Repository[]>(
    ['contributor-repos', username, page],
    async () => {
      const response = await fetch(
        `https://api.github.com/users/${username}/repos?sort=updated&per_page=${PER_PAGE}&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            Accept: 'application/vnd.github.v3+json'
          },
        }
      );
      return response.json();
    },
    {
      enabled: !!username,
      staleTime: 5 * 60 * 1000,
      keepPreviousData: true,
    }
  );

  const Pagination = () => {
    const hasMorePages = repos && Array.isArray(repos) && repos.length >= PER_PAGE;

    return (
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
          disabled={!hasMorePages}
          className={`p-2 rounded-lg ${
            !hasMorePages
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  };

  const formatActivityMessage = (event: ActivityEvent) => {
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

  if (userLoading) return <ProfileSkeleton />;
  if (!user) return <div>User not found</div>;

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
                alt={user.name}
                className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-700 shadow-lg"
              />
              <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
                {user.name}
              </h1>
              <h2 className="text-gray-600 dark:text-gray-400">@{user.login}</h2>
              
              {user.bio && (
                <p className="mt-4 text-center text-gray-600 dark:text-gray-300">
                  {user.bio}
                </p>
              )}

              <div className="mt-6 flex items-center justify-center space-x-6 text-gray-600 dark:text-gray-300">
                <button
                  onClick={() => setActiveModal('followers')}
                  className="flex flex-col items-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <span className="text-2xl font-bold">{user.followers}</span>
                  <span className="text-sm">Followers</span>
                </button>
                <button
                  onClick={() => setActiveModal('following')}
                  className="flex flex-col items-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <span className="text-2xl font-bold">{user.following}</span>
                  <span className="text-sm">Following</span>
                </button>
                <button
                  onClick={() => setActiveModal('repos')}
                  className="flex flex-col items-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <span className="text-2xl font-bold">{user.public_repos}</span>
                  <span className="text-sm">Repos</span>
                </button>
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
                    <a 
                      href={formatUrl(user.blog)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
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
        </div>

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
                {starredRepos || 0}
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

        {organizations?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-white dark:bg-[#0B1222] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-white/10"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Organizations
            </h3>
            <div className="grid grid-cols-4 gap-4">
              {organizations.map((org: { id: number; avatar_url: string; login: string }) => (
                <a
                  key={org.id}
                  href={`https://github.com/${org.login}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity"
                >
                  <img
                    src={org.avatar_url}
                    alt={org.login}
                    className="w-12 h-12 rounded-lg"
                    title={org.login}
                  />
                </a>
              ))}
            </div>
          </motion.div>
        )}
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
                {activityEvents?.slice(0, 10).map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <img
                        src={user.avatar_url}
                        alt={user.name || user.login}
                        className="w-8 h-8 rounded-full"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white">
                        <span className="font-medium">{username}</span>{' '}
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
                      {repos?.slice(0, 6).map((repo) => (
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
                      <div className="mt-8">
                        <h3 className="text-xl font-semibold mb-4">Repositories</h3>
                        {reposLoading ? (
                          <LoadingSpinner />
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {repos?.map((repo) => (
                              <a
                                key={repo.id}
                                href={repo.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                              >
                                <h4 className="text-lg font-medium text-blue-600 dark:text-blue-400 mb-2">
                                  {repo.name}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                                  {repo.description || 'No description available'}
                                </p>
                                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                  {repo.language && (
                                    <span className="flex items-center gap-1">
                                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                      {repo.language}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Star className="w-4 h-4" />
                                    {repo.stargazers_count}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <GitFork className="w-4 h-4" />
                                    {repo.forks_count}
                                  </span>
                                </div>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      <Pagination />
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <StatsModal
        isOpen={activeModal === 'followers'}
        onClose={() => setActiveModal(null)}
        title="Followers"
        data={followers?.pages.flatMap(page => page.data)}
        isLoading={followersLoading}
        hasMore={hasMoreFollowers}
        onLoadMore={() => fetchMoreFollowers()}
        isLoadingMore={isLoadingMoreFollowers}
      />

      <StatsModal
        isOpen={activeModal === 'following'}
        onClose={() => setActiveModal(null)}
        title="Following"
        data={following?.pages.flatMap(page => page.data)}
        isLoading={followingLoading}
        hasMore={hasMoreFollowing}
        onLoadMore={() => fetchMoreFollowing()}
        isLoadingMore={isLoadingMoreFollowing}
      />

      <StatsModal
        isOpen={activeModal === 'repos'}
        onClose={() => setActiveModal(null)}
        title="Repositories"
        data={repos}
        isLoading={reposLoading}
        hasMore={repos && Array.isArray(repos) && repos.length > 0}
        onLoadMore={() => {}}
        isLoadingMore={false}
      />
    </div>
  );
};

export default ContributorProfile; 