import { memo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { Comment } from '../../types/comments';

interface CommentItemProps {
  comment: Comment;
}

const CommentItem = memo(({ comment }: CommentItemProps) => {
  return (
    <div className="mb-6 last:mb-0 bg-white/90 dark:bg-[#0B1222] backdrop-blur-lg rounded-lg p-4 hover:bg-gray-50/50 dark:hover:bg-white/10 transition-colors">
      <div className="flex items-start space-x-4">
        <img
          src={comment.user.avatar_url}
          alt={comment.user.login}
          className="w-10 h-10 rounded-full flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-gray-200 truncate">
              {comment.user.login}
            </h4>
            <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
          </div>
          <div className="prose prose-sm max-w-none text-gray-800 dark:text-gray-300 break-words whitespace-pre-wrap">
            {comment.body}
          </div>
        </div>
      </div>
    </div>
  );
});

CommentItem.displayName = 'CommentItem';

export default CommentItem; 