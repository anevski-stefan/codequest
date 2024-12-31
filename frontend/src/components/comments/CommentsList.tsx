import { memo } from 'react';
import CommentItem from './CommentItem';
import LoadingSpinner from '../LoadingSpinner';
import { LoadMoreButton } from './LoadMoreButton';
import type { Comment } from '../../types/comments';

interface CommentsListProps {
  comments: Comment[];
  isLoading: boolean;
  hasMoreComments: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

export const CommentsList = memo(function CommentsList({
  comments,
  isLoading,
  hasMoreComments,
  isLoadingMore,
  onLoadMore
}: CommentsListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <p className="text-center text-gray-500 dark:text-gray-400 py-8">
        No comments yet. Be the first to comment!
      </p>
    );
  }

  return (
    <>
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
      
      {hasMoreComments && (
        <div className="flex justify-center pt-4">
          <LoadMoreButton 
            onClick={onLoadMore}
            isLoading={isLoadingMore}
          />
        </div>
      )}
    </>
  );
}); 