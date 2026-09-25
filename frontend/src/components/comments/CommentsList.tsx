import { memo } from 'react';
import CommentItem from './CommentItem';
import LoadingSpinner from '../LoadingSpinner';
import LoadMoreButton from '../ui/LoadMoreButton';
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
    return <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>;
  }
  if (comments.length === 0) {
    return <p className="text-[13px] text-gray-500 py-2">No comments yet. If you want to work on this, say so here so the maintainers can assign you.</p>;
  }
  return <>
      {comments.map(comment => <CommentItem key={comment.id} comment={comment} />)}
      
      {hasMoreComments && <div className="flex justify-center pt-2">
          <LoadMoreButton onClick={onLoadMore} isLoading={isLoadingMore} />
        </div>}
    </>;
});