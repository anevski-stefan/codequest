import { useQuery } from 'react-query';
import { getActivity } from '../../../services/github';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  type: string;
  repo: string;
  date: string;
  payload: any;
}

const ActivityFeed = () => {
  const { data: activities, isLoading, error } = useQuery('activity', getActivity);

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 bg-gray-100 rounded"></div>
      ))}
    </div>;
  }

  if (error) {
    return <div className="text-red-500">Failed to load activity</div>;
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'PushEvent':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        );
      case 'IssuesEvent':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
    }
  };

  return (
    <div className="space-y-4">
      {activities?.map((activity: Activity) => (
        <div key={activity.id} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
          <div className="text-gray-600">
            {getActivityIcon(activity.type)}
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium">
                {activity.type.replace('Event', '')} to{' '}
                <span className="font-semibold">{activity.repo}</span>
              </p>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
              </span>
            </div>
            {activity.payload.commits && (
              <div className="mt-1 text-sm text-gray-600">
                {activity.payload.commits.length} commit(s)
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityFeed; 