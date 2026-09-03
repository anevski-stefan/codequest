import { motion } from 'framer-motion';
import LoadingSpinner from '../LoadingSpinner';
import type { GitHubActivityEvent } from '../../types/github';
import { formatActivityMessage } from './formatActivityMessage';
import { formatStandardDate } from '../../utils/formatDate';

interface RecentActivityListProps {
  activities: GitHubActivityEvent[];
  isLoading?: boolean;
}

const RecentActivityList = ({ activities, isLoading = false }: RecentActivityListProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white dark:bg-[#0B1222] rounded-xl shadow-sm p-6 border border-gray-200 dark:border-white/10"
  >
    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
      Recent Activity
    </h2>
    {isLoading ? (
      <LoadingSpinner />
    ) : (
      <div className="space-y-4">
        {activities.slice(0, 10).map((event) => (
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
                width={32}
                height={32}
                loading="lazy"
                decoding="async"
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
                {formatStandardDate(event.created_at)}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    )}
  </motion.div>
);

export default RecentActivityList;
