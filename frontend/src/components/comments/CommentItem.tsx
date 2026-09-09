import { memo } from 'react';
import { formatRelativeDate } from '../../utils/formatDate';
import type { Comment } from '../../types/comments';
interface CommentItemProps {
  comment: Comment;
}
const CommentItem = memo(({
  comment
}: CommentItemProps) => {
  return (
    <div className="mb-3 last:mb-0 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 hover:bg-white/[0.035] transition-colors">
      <div className="flex items-start gap-3">
        <img src={comment.user.avatar_url} alt={comment.user.login} width={28} height={28} loading="lazy" decoding="async" className="w-7 h-7 rounded-full ring-1 ring-white/[0.08] shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs font-semibold text-gray-300 truncate">{comment.user.login}</span>
            <span className="text-[10px] text-gray-700 shrink-0">{formatRelativeDate(comment.createdAt)}</span>
          </div>
          <p className="text-xs text-gray-500 break-words whitespace-pre-wrap leading-relaxed">{comment.body}</p>
        </div>
      </div>
    </div>
  );
});
CommentItem.displayName = 'CommentItem';
export default CommentItem;