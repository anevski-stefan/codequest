import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import type { RootState } from '../../store';
import { usePageTitle } from '../../hooks/usePageTitle';
import { getUserRepositories, getUserActivities, getUserStarredCount } from '../../services/github';
import { ProfileSkeleton } from '../../components/skeletons/ProfileSkeleton';
import ProfileLayout from '../../components/profile/ProfileLayout';

const Profile = () => {
  usePageTitle('Profile');
  const { user } = useSelector((state: RootState) => state.auth);
  const PER_PAGE = 10;
  const [page, setPage] = useState(1);

  const { data: repos, isLoading: reposLoading } = useQuery({
    queryKey: ['user-repos', page],
    queryFn: () => getUserRepositories(page, PER_PAGE),
  });
  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['user-activities'],
    queryFn: () => getUserActivities(user?.login as string),
    enabled: !!user?.login,
  });
  const { data: starredCount } = useQuery({
    queryKey: ['user-starred'],
    queryFn: () => getUserStarredCount(),
  });

  if (reposLoading || activitiesLoading) return <ProfileSkeleton />;
  if (!user) return (
    <div className="flex flex-1 items-center justify-center text-sm text-gray-600">
      Session unavailable — please log in again.
    </div>
  );

  const statItems = [
    { label: 'Followers', value: user.followers },
    { label: 'Following', value: user.following },
    { label: 'Repos', value: user.public_repos },
    { label: 'Starred', value: starredCount ?? 0 },
  ];

  return (
    <ProfileLayout
      user={user}
      statItems={statItems}
      repos={repos}
      reposLoading={false}
      activities={activities}
      activitiesLoading={false}
      page={page}
      perPage={PER_PAGE}
      onPageChange={setPage}
      activitySlice={10}
    />
  );
};

export default Profile;
