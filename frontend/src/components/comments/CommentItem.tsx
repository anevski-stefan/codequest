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
    <div className="relative pb-5 last:pb-0">
      <div className="flex items-start gap-3">
        <img src={comment.user.avatar_url} alt={comment.user.login} width={28} height={28} loading="lazy" decoding="async" className="relative w-7 h-7 rounded-full ring-2 ring-[#2A2E40] shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5 pt-1">
            <span className="text-[13px] font-semibold text-gray-200 truncate">{comment.user.login}</span>
            <span className="text-[11px] text-gray-500 shrink-0">{formatRelativeDate(comment.createdAt)}</span>
          </div>
          <p className="text-[13px] text-gray-300 break-words whitespace-pre-wrap leading-relaxed rounded-xl rounded-tl-sm border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5">{comment.body}</p>
        </div>
      </div>
    </div>
  );
});
CommentItem.displayName = 'CommentItem';
export default CommentItem;