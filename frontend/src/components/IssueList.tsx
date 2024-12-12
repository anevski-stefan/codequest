import { Issue } from '../types/github';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare } from 'lucide-react';
import { getStateColor, getLabelColors } from '../features/dashboard/utils/filterUtils';
import LoadingSpinner from './LoadingSpinner';

interface IssueListProps {
  issues: Issue[];
  onViewComments: (issue: Issue) => void;
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  onLoadMore: () => void;
}

const IssueList = ({ issues, onViewComments, isLoading, error, hasMore, onLoadMore }: IssueListProps) => {
  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600">{error.message}</div>;

  return (
    <div className="space-y-4">
      {issues.map((issue) => (
        <div 
          key={`${issue.repository?.fullName}-${issue.number}`} 
          className="relative py-4 group"
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gray-50/5 dark:bg-white/5 transition-opacity rounded-lg" />
          <div className="relative">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col md:flex-row md:items-start justify-between">
                <div className="flex-1">
                  <a 
                    href={issue.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-sm md:text-base font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                  >
                    {issue.title}
                  </a>
                  <p className="mt-0.5 text-xs md:text-sm text-gray-500 dark:text-gray-400">
                    {issue.repository?.fullName} #{issue.number}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2 md:mt-0 md:ml-4">
                  {issue.labels.map((label) => (
                    <span
                      key={label.name}
                      className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap max-w-[120px]"
                      style={getLabelColors(label.color)}
                      title={label.name}
                    >
                      <span className="truncate">
                        {label.name.length > 20 ? `${label.name.slice(0, 20)}...` : label.name}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-0 text-sm">
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
                <div className="flex flex-wrap items-center gap-2 md:space-x-3">
                  <button
                    onClick={() => onViewComments(issue)}
                    className="flex-1 md:flex-none inline-flex items-center justify-center px-3 py-1.5 text-xs md:text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-md transition-colors"
                  >
                    <MessageSquare size={14} className="mr-1.5" />
                    View Comments
                  </button>
                  <a 
                    href={issue.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex-1 md:flex-none inline-flex items-center justify-center px-3 py-1.5 text-xs md:text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-md transition-colors"
                  >
                    View on GitHub
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {hasMore && (
        <div className="flex justify-center mt-6">
          <button
            onClick={onLoadMore}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
};

export default IssueList; 