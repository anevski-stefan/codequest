import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import axios from 'axios';
import { api, getUserStarredCount, getUserActivities } from '../../services/github';
import LoadingSpinner from '../../components/LoadingSpinner';
import { motion } from 'framer-motion';
import { Star, GitFork } from 'lucide-react';
import StatsModal from '../../components/StatsModal';
import { ProfileSkeleton } from '../../components/skeletons';
import { Pagination } from '../../components/ui/Pagination';
import ProfileStatsCard from '../../components/profile/ProfileStatsCard';
import ProfileInfoItems from '../../components/profile/ProfileInfoItems';
import RecentActivityList from '../../components/profile/RecentActivityList';
import RepositoryList from '../../components/profile/RepositoryList';
import type { GitHubActivityEvent, GitHubRepo } from '../../types/github';
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
const ContributorProfile = () => {
  const {
    username
  } = useParams<{
    username: string;
  }>();
  const [activeTab, setActiveTab] = useState<'overview' | 'repositories'>('overview');
  const [page, setPage] = useState(1);
  const PER_PAGE = 30;
  const [activeModal, setActiveModal] = useState<'followers' | 'following' | 'repos' | null>(null);
  const {
    data: user,
    isLoading: userLoading,
    isError: userError,
    error: userQueryError
  } = useQuery<ContributorDetails>({
    queryKey: ['contributor', username],
    queryFn: async () => {
      const {
        data
      } = await api.get(`/api/github/users/${username}`);
      return data;
    }
  });
  const {
    data: organizations
  } = useQuery({
    queryKey: ['contributor-orgs', username],
    queryFn: async () => {
      const {
        data
      } = await api.get(`/api/github/users/${username}/orgs`);
      return data;
    }
  });
  const {
    data: starredRepos
  } = useQuery({
    queryKey: ['contributor-starred', username],
    queryFn: () => getUserStarredCount(username),
  });
  const {
    data: activityEvents,
    isLoading: activitiesLoading
  } = useQuery<GitHubActivityEvent[]>({
    queryKey: ['contributor-activity', username],
    queryFn: () => getUserActivities(username!),
    enabled: !!username,
  });
  const {
    data: followers,
    isLoading: followersLoading,
    isFetchingNextPage: isLoadingMoreFollowers,
    fetchNextPage: fetchMoreFollowers,
    hasNextPage: hasMoreFollowers
  } = useInfiniteQuery({
    queryKey: ['contributor-followers', username],
    queryFn: async ({
      pageParam = 1
    }) => {
      const {
        data
      } = await api.get(`/api/github/users/${username}/followers`, {
        params: {
          per_page: PER_PAGE,
          page: pageParam
        }
      });
      return {
        data,
        nextPage: data.length === PER_PAGE ? pageParam + 1 : undefined
      };
    },
    initialPageParam: 1,
    getNextPageParam: lastPage => lastPage.nextPage,
    enabled: activeModal === 'followers'
  });
  const {
    data: following,
    isLoading: followingLoading,
    isFetchingNextPage: isLoadingMoreFollowing,
    fetchNextPage: fetchMoreFollowing,
    hasNextPage: hasMoreFollowing
  } = useInfiniteQuery({
    queryKey: ['contributor-following', username],
    queryFn: async ({
      pageParam = 1
    }) => {
      const {
        data
      } = await api.get(`/api/github/users/${username}/following`, {
        params: {
          per_page: PER_PAGE,
          page: pageParam
        }
      });
      return {
        data,
        nextPage: data.length === PER_PAGE ? pageParam + 1 : undefined
      };
    },
    initialPageParam: 1,
    getNextPageParam: lastPage => lastPage.nextPage,
    enabled: activeModal === 'following'
  });
  const {
    data: repos,
    isLoading: reposLoading
  } = useQuery<GitHubRepo[]>({
    queryKey: ['contributor-repos', username, page],
    queryFn: async () => {
      const {
        data
      } = await api.get(`/api/github/users/${username}/repos`, {
        params: {
          sort: 'updated',
          per_page: PER_PAGE,
          page
        }
      });
      return data;
    },
    enabled: !!username,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData
  });
  if (userLoading) return <ProfileSkeleton />;
  if (userError) {
    const isNotFound = axios.isAxiosError(userQueryError) && userQueryError.response?.status === 404;
    if (isNotFound) {
      return <div className="flex flex-1 items-center justify-center p-8">
          <div className="max-w-md text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">User not found</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This GitHub username does not exist or is no longer accessible.
            </p>
          </div>
        </div>;
    }
    return <div className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Failed to load profile</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Something went wrong while fetching this profile. Please try again.
          </p>
        </div>
      </div>;
  }
  if (!user) return <div>User not found</div>;
  const allFollowers = useMemo(() => followers?.pages.flatMap(page => page.data) ?? [], [followers]);
  const allFollowing = useMemo(() => following?.pages.flatMap(page => page.data) ?? [], [following]);

  return <div className="flex flex-col md:flex-row flex-1 dark:bg-[#0B1222] mt-8 gap-6 p-4 md:p-6">
      {/* existing code */}
      <div className="md:w-80 shrink-0">
        <div className="sticky top-8">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} className="bg-white dark:bg-[#0B1222] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-white/10">
            <div className="flex flex-col items-center">
              <img src={user.avatar_url} alt={user.name} width={128} height={128} decoding="async" className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-700 shadow-lg" />
              <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
                {user.name}
              </h1>
              <h2 className="text-gray-600 dark:text-gray-400">@{user.login}</h2>
              
              {user.bio && <p className="mt-4 text-center text-gray-600 dark:text-gray-300">
                  {user.bio}
                </p>}

              <div className="mt-6 flex items-center justify-center space-x-6 text-gray-600 dark:text-gray-300">
                <button onClick={() => setActiveModal('followers')} className="flex flex-col items-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  <span className="text-2xl font-bold">{user.followers}</span>
                  <span className="text-sm">Followers</span>
                </button>
                <button onClick={() => setActiveModal('following')} className="flex flex-col items-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  <span className="text-2xl font-bold">{user.following}</span>
                  <span className="text-sm">Following</span>
                </button>
                <button onClick={() => setActiveModal('repos')} className="flex flex-col items-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  <span className="text-2xl font-bold">{user.public_repos}</span>
                  <span className="text-sm">Repos</span>
                </button>
              </div>

              <ProfileInfoItems
                company={user.company}
                location={user.location}
                blog={user.blog}
                twitter_username={user.twitter_username}
                created_at={user.created_at}
              />
            </div>
          </motion.div>
        </div>

          <ProfileStatsCard
            starredCount={starredRepos}
            publicGists={user.public_gists}
            hireable={user.hireable}
          />

        {organizations?.length > 0 && <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="mt-6 bg-white dark:bg-[#0B1222] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-white/10">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Organizations
            </h3>
            <div className="grid grid-cols-4 gap-4">
              {organizations.map((org: {
            id: number;
            avatar_url: string;
            login: string;
          }) => <a key={org.id} href={`https://github.com/${org.login}`} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                  <img src={org.avatar_url} alt={org.login} width={48} height={48} loading="lazy" decoding="async" className="w-12 h-12 rounded-lg" title={org.login} />
                </a>)}
            </div>
          </motion.div>}
      </div>

      {/* */}
      <div className="flex-1 min-w-0">
        <div className="space-y-6">
          {/* */}
          <RecentActivityList activities={activityEvents ?? []} isLoading={activitiesLoading} />

          {/* */}
          <div className="bg-white dark:bg-[#0B1222] rounded-xl shadow-sm border border-gray-200 dark:border-white/10">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                {(['overview', 'repositories'] as const).map(tab => <button key={tab} onClick={() => setActiveTab(tab)} className={`
                      py-4 px-1 border-b-2 font-medium text-sm
                      ${activeTab === tab ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                    `}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>)}
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'overview' ? <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Popular Repositories
                  </h3>
                  {reposLoading ? <LoadingSpinner /> : <RepositoryList repos={repos?.slice(0, 6) ?? []} />}
                </div> : <div className="space-y-4">
                  {reposLoading ? <LoadingSpinner /> : <>
                      <div className="mt-8">
                        <h3 className="text-xl font-semibold mb-4">Repositories</h3>
                        {reposLoading ? <LoadingSpinner /> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {repos?.map(repo => <a key={repo.id} href={repo.html_url} target="_blank" rel="noopener noreferrer" className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                                <h4 className="text-lg font-medium text-blue-600 dark:text-blue-400 mb-2">
                                  {repo.name}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                                  {repo.description || 'No description available'}
                                </p>
                                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                  {repo.language && <span className="flex items-center gap-1">
                                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                      {repo.language}
                                    </span>}
                                  <span className="flex items-center gap-1">
                                    <Star className="w-4 h-4" />
                                    {repo.stargazers_count}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <GitFork className="w-4 h-4" />
                                    {repo.forks_count}
                                  </span>
                                </div>
                              </a>)}
                          </div>}
                      </div>
                      <Pagination currentPage={page} hasMore={!!repos && Array.isArray(repos) && repos.length >= PER_PAGE} onPageChange={setPage} />
                    </>}
                </div>}
            </div>
          </div>
        </div>
      </div>

      <StatsModal isOpen={activeModal === 'followers'} onClose={() => setActiveModal(null)} title="Followers" data={allFollowers} isLoading={followersLoading} hasMore={hasMoreFollowers} onLoadMore={() => fetchMoreFollowers()} isLoadingMore={isLoadingMoreFollowers} />

      <StatsModal isOpen={activeModal === 'following'} onClose={() => setActiveModal(null)} title="Following" data={allFollowing} isLoading={followingLoading} hasMore={hasMoreFollowing} onLoadMore={() => fetchMoreFollowing()} isLoadingMore={isLoadingMoreFollowing} />

      <StatsModal isOpen={activeModal === 'repos'} onClose={() => setActiveModal(null)} title="Repositories" data={repos} isLoading={reposLoading} hasMore={repos && Array.isArray(repos) && repos.length > 0} onLoadMore={() => {}} isLoadingMore={false} />
    </div>;
};
export default ContributorProfile;