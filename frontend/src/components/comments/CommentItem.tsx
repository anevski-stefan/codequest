import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
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
          <div className="text-[13px] break-words leading-relaxed rounded-xl rounded-tl-sm border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5 prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-p:first:mt-0 prose-p:last:mb-0 prose-p:whitespace-pre-wrap prose-a:text-blue-300 prose-headings:text-white prose-headings:font-semibold prose-h1:text-[13px] prose-h2:text-[13px] prose-h3:text-[13px] prose-strong:text-white prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-li:text-gray-300 prose-code:text-blue-200 prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[#1D2030] prose-pre:border prose-pre:border-white/[0.06] prose-img:rounded-lg prose-blockquote:border-l-white/[0.14] prose-blockquote:text-gray-400 prose-hr:border-white/[0.08]">
            <ReactMarkdown>{comment.body}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
});
CommentItem.displayName = 'CommentItem';
export default CommentItem;