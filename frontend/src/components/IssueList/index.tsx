import type { IssueListProps } from './types';
import { IssueCard } from './IssueCard';
import { LoadMoreButton } from './LoadMoreButton';
import LoadingSpinner from '../LoadingSpinner';
import { memo } from 'react';

const ErrorMessage = memo(({ message }: { message: string }) => (
  <div className="text-red-600">{message}</div>
));

ErrorMessage.displayName = 'ErrorMessage';

const IssueList = ({ 
  issues, 
  onViewComments, 
  isLoading, 
  error, 
  hasMore, 
  onLoadMore 
}: IssueListProps) => {
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} />;

  return (
    <div className="space-y-4">
      {issues.map((issue) => (
        <IssueCard
          key={`${issue.repository?.fullName}-${issue.number}`}
          issue={issue}
          onViewComments={onViewComments}
        />
      ))}

      {hasMore && <LoadMoreButton onClick={onLoadMore} />}
    </div>
  );
};

export default memo(IssueList); 