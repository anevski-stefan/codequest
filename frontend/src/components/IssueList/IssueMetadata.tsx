import { formatDistanceToNow } from 'date-fns';
import { getStateColor } from '../../features/dashboard/utils/filterUtils';
import type { IssueMetadataProps } from './types';

export const IssueMetadata = ({ issue }: IssueMetadataProps) => (
  <div className="flex flex-wrap md:flex-nowrap items-center gap-2 md:space-x-4 text-gray-500 dark:text-gray-400">
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${getStateColor(issue.state)}`}>
      <span className={`w-2 h-2 rounded-full mr-2 ${
        issue.state === 'open' ? 'bg-green-500' : 'bg-purple-500'
      }`} />
      {issue.state}
    </span>
    <span className="hidden md:inline">•</span>
    <span className="text-xs md:text-sm">
      Created {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
    </span>
    <span className="hidden md:inline">•</span>
    <span className="text-xs md:text-sm">
      {issue.commentsCount} comments
    </span>
  </div>
); 