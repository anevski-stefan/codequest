import { useCallback } from 'react';
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

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMoreComments) {
      onLoadMore();
    }
  }, [isLoadingMore, hasMoreComments, onLoadMore]);

  const escapeHtml = useCallback((unsafe: string) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }, []);

  const handleAddComment = useCallback(async (comment: string) => {
    const escapedComment = escapeHtml(comment);
    await onAddComment(escapedComment);
  }, [onAddComment, escapeHtml]);

  // Escape comment content before displaying
  const escapedComments = sortedComments.map(comment => ({
    ...comment,
    body: escapeHtml(comment.body)
  }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Comments">
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        <CommentsList
          comments={escapedComments}
          isLoading={isLoading}
          hasMoreComments={hasMoreComments}
          isLoadingMore={isLoadingMore}
          onLoadMore={handleLoadMore}
        />
      </div>

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <CommentForm onSubmit={handleAddComment} />
      </div>
    </Modal>
  );
} 