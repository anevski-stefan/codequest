import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import axios from 'axios';
import {
  Star, GitFork, Calendar, MapPin, Link as LinkIcon,
  Building, X as XIcon, Briefcase, ExternalLink,
  BookOpen, Activity,
} from 'lucide-react';
import { api, getUserStarredCount, getUserActivities } from '../../services/github';
import { LANGUAGE_COLORS } from '../../constants/languageColors';
import { formatCount } from '../../utils/formatCount';
import StatsModal from '../../components/StatsModal';
import { ProfileSkeleton } from '../../components/skeletons';
import { Pagination } from '../../components/ui/Pagination';
import { formatActivityMessage } from '../../components/profile/formatActivityMessage';
import { formatStandardDate } from '../../utils/formatDate';
import { formatUrl, formatDisplayUrl } from '../../utils/formatUrl';
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
}


const ContributorProfile = () => {
  const { username } = useParams<{ username: string }>();
  const [activeTab, setActiveTab] = useState<'overview' | 'repositories'>('overview');
  const [page, setPage] = useState(1);
  const PER_PAGE = 30;
  const [activeModal, setActiveModal] = useState<'followers' | 'following' | null>(null);

  const { data: user, isLoading: userLoading, isError: userError, error: userQueryError } =
    useQuery<ContributorDetails>({
      queryKey: ['contributor', username],
      queryFn: async () => { const { data } = await api.get(`/api/github/users/${username}`); return data; },
    });

  const { data: organizations } = useQuery({
    queryKey: ['contributor-orgs', username],
    queryFn: async () => { const { data } = await api.get(`/api/github/users/${username}/orgs`); return data; },
  });

  const { data: starredCount } = useQuery({
    queryKey: ['contributor-starred', username],
    queryFn: () => getUserStarredCount(username),
  });

  const { data: activityEvents, isLoading: activitiesLoading } = useQuery<GitHubActivityEvent[]>({
    queryKey: ['contributor-activity', username],
    queryFn: () => getUserActivities(username!),
    enabled: !!username,
  });

  const { data: followers, isLoading: followersLoading, isFetchingNextPage: isLoadingMoreFollowers, fetchNextPage: fetchMoreFollowers, hasNextPage: hasMoreFollowers } =
    useInfiniteQuery({
      queryKey: ['contributor-followers', username],
      queryFn: async ({ pageParam = 1 }) => {
        const { data } = await api.get(`/api/github/users/${username}/followers`, { params: { per_page: PER_PAGE, page: pageParam } });
        return { data, nextPage: data.length === PER_PAGE ? (pageParam as number) + 1 : undefined };
      },
      initialPageParam: 1,
      getNextPageParam: lastPage => lastPage.nextPage,
      enabled: activeModal === 'followers',
    });

  const { data: following, isLoading: followingLoading, isFetchingNextPage: isLoadingMoreFollowing, fetchNextPage: fetchMoreFollowing, hasNextPage: hasMoreFollowing } =
    useInfiniteQuery({
      queryKey: ['contributor-following', username],
      queryFn: async ({ pageParam = 1 }) => {
        const { data } = await api.get(`/api/github/users/${username}/following`, { params: { per_page: PER_PAGE, page: pageParam } });
        return { data, nextPage: data.length === PER_PAGE ? (pageParam as number) + 1 : undefined };
      },
      initialPageParam: 1,
      getNextPageParam: lastPage => lastPage.nextPage,
      enabled: activeModal === 'following',
    });

  const { data: repos, isLoading: reposLoading } = useQuery<GitHubRepo[]>({
    queryKey: ['contributor-repos', username, page],
    queryFn: async () => {
      const { data } = await api.get(`/api/github/users/${username}/repos`, { params: { sort: 'updated', per_page: PER_PAGE, page } });
      return data;
    },
    enabled: !!username,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  // Hooks must be before early returns
  const allFollowers = useMemo(() => followers?.pages.flatMap(p => p.data) ?? [], [followers]);
  const allFollowing = useMemo(() => following?.pages.flatMap(p => p.data) ?? [], [following]);

  if (userLoading) return <ProfileSkeleton />;

  if (userError) {
    const isNotFound = axios.isAxiosError(userQueryError) && userQueryError.response?.status === 404;
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-300">{isNotFound ? 'User not found' : 'Failed to load profile'}</p>
          <p className="text-xs text-gray-600 mt-1">{isNotFound ? 'This GitHub username does not exist.' : 'Something went wrong. Please try again.'}</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const statItems = [
    { label: 'Followers', value: formatCount(user.followers), onClick: () => setActiveModal('followers') },
    { label: 'Following', value: formatCount(user.following), onClick: () => setActiveModal('following') },
    { label: 'Repos', value: user.public_repos, onClick: undefined },
    { label: 'Starred', value: starredCount ?? 0, onClick: undefined },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden">

      {/* ── Hero header ── */}
      <div className="shrink-0 border-b border-white/[0.05] px-8 pt-7 pb-6">
        <div className="flex items-start gap-6">

          {/* Avatar */}
          <img
            src={user.avatar_url}
            alt={user.name || user.login}
            width={72}
            height={72}
            decoding="async"
            className="w-[72px] h-[72px] rounded-2xl ring-2 ring-white/[0.08] shrink-0"
          />

          {/* Name + bio + links */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-white leading-tight">{user.name ?? user.login}</h1>
              <span className="text-sm text-gray-600">@{user.login}</span>
              {user.hireable && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
                  <Briefcase className="w-2.5 h-2.5" />
                  Available for hire
                </span>
              )}
            </div>

            {user.bio && (
              <p className="mt-1.5 text-sm text-gray-500 leading-relaxed max-w-xl">{user.bio}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {user.company && (
                <span className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Building className="w-3.5 h-3.5 text-gray-700" />{user.company}
                </span>
              )}
              {user.location && (
                <span className="flex items-center gap-1.5 text-xs text-gray-600">
                  <MapPin className="w-3.5 h-3.5 text-gray-700" />{user.location}
                </span>
              )}
              {user.blog && (
                <a href={formatUrl(user.blog)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  <LinkIcon className="w-3.5 h-3.5" />{formatDisplayUrl(user.blog)}
                </a>
              )}
              {user.twitter_username && (
                <a href={`https://twitter.com/${user.twitter_username}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  <XIcon className="w-3.5 h-3.5" />@{user.twitter_username}
                </a>
              )}
              <span className="flex items-center gap-1.5 text-xs text-gray-600">
                <Calendar className="w-3.5 h-3.5 text-gray-700" />
                Joined {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <a href={`https://github.com/${user.login}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />GitHub
              </a>
            </div>
          </div>

          {/* Stats block */}
          <div className="flex items-center gap-px shrink-0 rounded-xl overflow-hidden border border-white/[0.07]">
            {statItems.map(({ label, value, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                disabled={!onClick}
                className={`flex flex-col items-center px-5 py-3 bg-[#0D1525] border-r border-white/[0.07] last:border-r-0 transition-colors ${
                  onClick ? 'hover:bg-white/[0.04] cursor-pointer' : 'cursor-default'
                }`}
              >
                <span className="text-base font-bold text-white">{value}</span>
                <span className="text-[10px] text-gray-600 mt-0.5 whitespace-nowrap">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Organizations */}
        {organizations?.length > 0 && (
          <div className="mt-5 flex items-center gap-3">
            <span className="text-[10px] font-semibold text-gray-700 uppercase tracking-widest shrink-0">Orgs</span>
            <div className="flex items-center gap-2 flex-wrap">
              {organizations.map((org: { id: number; avatar_url: string; login: string }) => (
                <a key={org.id} href={`https://github.com/${org.login}`} target="_blank" rel="noopener noreferrer"
                  title={org.login} className="group relative">
                  <img src={org.avatar_url} alt={org.login} width={28} height={28} loading="lazy" decoding="async"
                    className="w-7 h-7 rounded-lg ring-1 ring-white/[0.08] group-hover:ring-white/20 transition-all" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: tabs + repos */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="px-6 border-b border-white/[0.05] shrink-0">
            <div className="flex items-center gap-1">
              {(['overview', 'repositories'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all cursor-pointer -mb-px capitalize ${
                    activeTab === tab ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {tab === 'overview' ? <BookOpen className="w-3.5 h-3.5" /> : <GitFork className="w-3.5 h-3.5" />}
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {activeTab === 'overview' ? (
              <>
                <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-widest mb-4">Popular Repositories</p>
                {reposLoading ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="animate-pulse p-4 rounded-xl bg-[#0D1525] border border-white/[0.06] h-28" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {(repos ?? []).slice(0, 6).map(repo => {
                      const langColor = LANGUAGE_COLORS[repo.language ?? ''] ?? '#6b7280';
                      return (
                        <a key={repo.id} href={repo.html_url} target="_blank" rel="noopener noreferrer"
                          className="group flex flex-col gap-2 p-4 rounded-xl bg-[#0D1525] border border-white/[0.06] hover:border-white/[0.13] hover:bg-[#111927] transition-all">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-blue-400 group-hover:text-blue-300 transition-colors truncate">{repo.name}</p>
                            <ExternalLink className="w-3 h-3 text-gray-700 group-hover:text-gray-400 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-all" />
                          </div>
                          {repo.description && (
                            <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">{repo.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-auto pt-1">
                            {repo.language && (
                              <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: langColor }} />
                                {repo.language}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-[11px] text-gray-600 ml-auto">
                              <Star className="w-3 h-3" />{repo.stargazers_count}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-gray-600">
                              <GitFork className="w-3 h-3" />{repo.forks_count}
                            </span>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-1.5">
                {reposLoading ? (
                  [...Array(8)].map((_, i) => (
                    <div key={i} className="animate-pulse h-14 rounded-xl bg-[#0D1525] border border-white/[0.06]" />
                  ))
                ) : (repos ?? []).map(repo => {
                  const langColor = LANGUAGE_COLORS[repo.language ?? ''] ?? '#6b7280';
                  return (
                    <a key={repo.id} href={repo.html_url} target="_blank" rel="noopener noreferrer"
                      className="group flex items-center gap-4 px-4 py-3 rounded-xl bg-[#0D1525] border border-white/[0.06] hover:border-white/[0.12] hover:bg-[#111927] transition-all">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-blue-400 group-hover:text-blue-300 transition-colors truncate">{repo.name}</p>
                        {repo.description && <p className="text-xs text-gray-600 mt-0.5 truncate">{repo.description}</p>}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {repo.language && (
                          <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: langColor }} />{repo.language}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[11px] text-gray-600">
                          <Star className="w-3 h-3" />{repo.stargazers_count}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-gray-600">
                          <GitFork className="w-3 h-3" />{repo.forks_count}
                        </span>
                      </div>
                    </a>
                  );
                })}
                <Pagination currentPage={page} hasMore={!!repos && Array.isArray(repos) && repos.length >= PER_PAGE} onPageChange={setPage} />
              </div>
            )}
          </div>
        </div>

        {/* Right: Recent Activity */}
        <div className="w-80 shrink-0 border-l border-white/[0.05] flex flex-col overflow-hidden">
          <div className="px-5 pt-5 pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-gray-700" />
              <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-widest">Recent Activity</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
            {activitiesLoading ? (
              <div className="px-5 py-4 text-xs text-gray-700">Loading…</div>
            ) : (activityEvents ?? []).slice(0, 15).map((event: GitHubActivityEvent) => (
              <div key={event.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                <img src={event.actor.avatar_url} alt={event.actor.login} width={24} height={24}
                  loading="lazy" decoding="async" className="w-6 h-6 rounded-full shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 leading-snug">
                    <span className="font-medium text-gray-400">{event.actor.login}</span>{' '}
                    {formatActivityMessage(event)}{' '}
                    <a href={`https://github.com/${event.repo.name}`} target="_blank" rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 transition-colors">
                      {event.repo.name.split('/')[1]}
                    </a>
                  </p>
                  <p className="text-[10px] text-gray-700 mt-0.5">{formatStandardDate(event.created_at)}</p>
                </div>
              </div>
            ))}
            {!activitiesLoading && (activityEvents ?? []).length === 0 && (
              <div className="px-5 py-8 text-center text-xs text-gray-700">No recent activity</div>
            )}
          </div>

          <div className="border-t border-white/[0.05] px-5 py-4 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Public gists</span>
              <span className="text-gray-400 font-medium">{user.public_gists}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <StatsModal isOpen={activeModal === 'followers'} onClose={() => setActiveModal(null)} title="Followers"
        data={allFollowers} isLoading={followersLoading} hasMore={hasMoreFollowers}
        onLoadMore={() => fetchMoreFollowers()} isLoadingMore={isLoadingMoreFollowers} />
      <StatsModal isOpen={activeModal === 'following'} onClose={() => setActiveModal(null)} title="Following"
        data={allFollowing} isLoading={followingLoading} hasMore={hasMoreFollowing}
        onLoadMore={() => fetchMoreFollowing()} isLoadingMore={isLoadingMoreFollowing} />
    </div>
  );
};

export default ContributorProfile;
