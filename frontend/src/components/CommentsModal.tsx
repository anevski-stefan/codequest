
import { Modal } from './ui/Modal';
import { CommentForm } from './comments/CommentForm';
import { CommentsList } from './comments/CommentsList';
import { useCommentSorting } from '../hooks/useCommentSorting';
import type { CommentsModalProps } from '../types/comments';
export default function CommentsModal({
  isOpen,
  onClose,
  comments,
  isLoading,
  onAddComment,
  onLoadMore,
  hasMoreComments,
  isLoadingMore
}: CommentsModalProps) {
  const sortedComments = useCommentSorting(comments);
  return <Modal isOpen={isOpen} onClose={onClose} title="Comments">
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        <CommentsList comments={sortedComments} isLoading={isLoading} hasMoreComments={hasMoreComments} isLoadingMore={isLoadingMore} onLoadMore={onLoadMore} />
      </div>

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <CommentForm onSubmit={onAddComment} />
      </div>
    </Modal>;
}