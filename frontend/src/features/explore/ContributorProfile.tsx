import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import axios from 'axios';
import { usePageTitle } from '../../hooks/usePageTitle';
import { api, getUserStarredCount, getUserActivities } from '../../services/github';
import { formatCount } from '../../utils/formatCount';
import StatsModal from '../../components/StatsModal';
import { ProfileSkeleton } from '../../components/skeletons';
import ProfileLayout from '../../components/profile/ProfileLayout';
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
  usePageTitle('Contributor');
  const { username } = useParams<{ username: string }>();
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
    { label: 'Repos', value: user.public_repos },
    { label: 'Starred', value: starredCount ?? 0 },
  ];

  const headerExtra = organizations?.length > 0 ? (
    <div className="mt-5 flex items-center gap-3">
      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest shrink-0">Orgs</span>
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
  ) : null;

  return (
    <ProfileLayout
      user={user}
      statItems={statItems}
      repos={repos}
      reposLoading={reposLoading}
      activities={activityEvents}
      activitiesLoading={activitiesLoading}
      page={page}
      perPage={PER_PAGE}
      onPageChange={setPage}
      activitySlice={15}
      headerExtra={headerExtra}
      modals={<>
        <StatsModal isOpen={activeModal === 'followers'} onClose={() => setActiveModal(null)} title="Followers"
          data={allFollowers} isLoading={followersLoading} hasMore={hasMoreFollowers}
          onLoadMore={() => fetchMoreFollowers()} isLoadingMore={isLoadingMoreFollowers} />
        <StatsModal isOpen={activeModal === 'following'} onClose={() => setActiveModal(null)} title="Following"
          data={allFollowing} isLoading={followingLoading} hasMore={hasMoreFollowing}
          onLoadMore={() => fetchMoreFollowing()} isLoadingMore={isLoadingMoreFollowing} />
      </>}
    />
  );
};

export default ContributorProfile;
