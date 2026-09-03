import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { Star, GitFork } from 'lucide-react';
import { motion } from 'framer-motion';
import LoadingSpinner from '../../components/LoadingSpinner';
import type { RootState } from '../../store';
import type { GitHubRepo } from '../../types/github';
import { usePageTitle } from '../../hooks/usePageTitle';
import { getUserRepositories, getUserActivities, getUserStarredCount } from '../../services/github';
import { ProfileSkeleton } from '../../components/skeletons/ProfileSkeleton';
import { Pagination } from '../../components/ui/Pagination';
import ProfileStatsCard from '../../components/profile/ProfileStatsCard';
import ProfileInfoItems from '../../components/profile/ProfileInfoItems';
import RecentActivityList from '../../components/profile/RecentActivityList';
import RepositoryList from '../../components/profile/RepositoryList';
const Profile = () => {
  usePageTitle('Profile');
  const {
    user
  } = useSelector((state: RootState) => state.auth);
  const [activeTab, setActiveTab] = useState<'overview' | 'repositories'>('overview');
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;
  const {
    data: repos,
    isLoading: reposLoading
  } = useQuery({
    queryKey: ['user-repos', page],
    queryFn: () => getUserRepositories(page, PER_PAGE)
  });
  const {
    data: activities,
    isLoading: activitiesLoading
  } = useQuery({
    queryKey: ['user-activities'],
    queryFn: () => getUserActivities(user?.login as string),
    enabled: !!user?.login
  });
  const {
    data: starredCount,
    isLoading: starredLoading
  } = useQuery({
    queryKey: ['user-starred'],
    queryFn: () => getUserStarredCount()
  });
  const isLoading = reposLoading || activitiesLoading || starredLoading;
  if (isLoading) return <ProfileSkeleton />;
  if (!user) return <div className="flex flex-1 items-center justify-center p-8 text-center">
      <p className="text-gray-600 dark:text-gray-400">Session unavailable — please log in again.</p>
    </div>;
  return <div className="flex flex-col md:flex-row flex-1 dark:bg-[#0B1222] mt-8 gap-6 p-4 md:p-6">
      {}
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
              <img src={user.avatar_url} alt={user.name || user.login} width={128} height={128} decoding="async" className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-700 shadow-lg" />
              <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
                {user.name}
              </h1>
              <h2 className="text-gray-600 dark:text-gray-400">
                @{user.login}
              </h2>
              
              {user.bio && <p className="mt-4 text-center text-gray-600 dark:text-gray-300">
                  {user.bio}
                </p>}

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

              <ProfileInfoItems
                company={user.company}
                location={user.location}
                blog={user.blog}
                twitter_username={user.twitter_username}
                created_at={user.created_at}
              />
            </div>
          </motion.div>

          <ProfileStatsCard
            starredCount={starredCount}
            publicGists={user.public_gists}
            hireable={user.hireable}
          />
        </div>
      </div>

      {}
      <div className="flex-1 min-w-0">
        <div className="space-y-6">
          {}
          <RecentActivityList activities={activities ?? []} isLoading={activitiesLoading} />

          {}
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
                      {repos?.map((repo: GitHubRepo) => <motion.div key={repo.id} initial={{
                  opacity: 0
                }} animate={{
                  opacity: 1
                }} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <h4 className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                            <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                              {repo.name}
                            </a>
                          </h4>
                          <p className="mt-2 text-gray-600 dark:text-gray-300">
                            {repo.description || 'No description available'}
                          </p>
                          <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                            {repo.language && <span className="flex items-center">
                                <span className="w-3 h-3 rounded-full bg-blue-500 mr-1"></span>
                                {repo.language}
                              </span>}
                            <span className="flex items-center">
                              <Star className="w-4 h-4 mr-1" />
                              {repo.stargazers_count}
                            </span>
                            <span className="flex items-center">
                              <GitFork className="w-4 h-4 mr-1" />
                              {repo.forks_count}
                            </span>
                          </div>
                        </motion.div>)}
                      <Pagination currentPage={page} hasMore={!!repos && repos.length >= PER_PAGE} onPageChange={setPage} />
                    </>}
                </div>}
            </div>
          </div>
        </div>
      </div>
    </div>;
};
export default Profile;