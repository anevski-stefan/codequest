import type { IssueListProps } from './types';
import { IssueCard } from './IssueCard';
import { LoadMoreButton } from './LoadMoreButton';
import { memo } from 'react';
import { CardSkeleton } from '../skeletons';

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
  if (isLoading) {
    return (
      <div className="grid gap-6">
        {[1, 2, 3].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }
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