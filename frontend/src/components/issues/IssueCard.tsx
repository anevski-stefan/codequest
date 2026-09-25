import { memo, type CSSProperties } from 'react';
import { MessageSquare, Star, ArrowUpRight, CircleCheck } from 'lucide-react';
import type { Issue } from '../../types/github';
import { LabelsCellContent } from '../ui/IssueTableCells';
import { formatRelativeDate } from '../../utils/formatDate';
import { formatCount } from '../../utils/formatCount';

interface IssueCardProps {
  issue: Issue;
  onOpen: (issue: Issue) => void;
  onPrefetch?: (issue: Issue) => void;
  /** Which timestamp to show; assigned work cares about recent activity. */
  dateField?: 'createdAt' | 'updatedAt';
  index?: number;
}

const IssueCard = memo(({ issue, onOpen, onPrefetch, dateField = 'createdAt', index = 0 }: IssueCardProps) => {
  const [owner, name] = (issue.repository?.fullName ?? '').split('/');
  const stars = issue.repoStars;
  const closed = issue.state !== 'open';

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`${issue.title}, ${issue.repository?.fullName ?? ''}`}
      style={{ '--i': index % 30 } as CSSProperties}
      onClick={() => onOpen(issue)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(issue); } }}
      onMouseEnter={() => onPrefetch?.(issue)}
      onFocus={() => onPrefetch?.(issue)}
      className="reveal group relative flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-[#2E3245] p-4 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-white/[0.14] hover:bg-[#31364C] hover:-translate-y-px hover:shadow-[0_12px_24px_-12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-0 active:scale-[0.995] transition-[background-color,border-color,box-shadow,transform] duration-200"
    >
      {/* Repository line */}
      <div className="flex items-center gap-2 min-w-0 text-[12px]">
        {owner && (
          <img
            src={`https://github.com/${owner}.png?size=40`}
            alt=""
            width={16}
            height={16}
            loading="lazy"
            decoding="async"
            className="w-4 h-4 rounded shrink-0 bg-white/[0.06]"
          />
        )}
        <span className="truncate min-w-0">
          <span className="text-gray-500">{owner}/</span>
          <span className="text-gray-300 font-medium">{name}</span>
        </span>
        <span className="font-mono text-[11px] text-gray-600 shrink-0">#{issue.number}</span>
        <span className="ml-auto flex items-center gap-1.5 shrink-0">
          {closed && (
            <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-md text-[10px] font-semibold border border-white/[0.1] bg-white/[0.04] text-gray-400 capitalize">
              <CircleCheck className="w-2.5 h-2.5" />{issue.state}
            </span>
          )}
          {stars ? (
            <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-md text-[10px] font-semibold border border-amber-400/20 bg-amber-400/[0.07] text-amber-300/90 tabular" title={`${stars.toLocaleString()} stars`}>
              <Star className="w-2.5 h-2.5 fill-current" />{formatCount(stars)}
            </span>
          ) : null}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-[14px] font-semibold text-gray-100 group-hover:text-white leading-snug line-clamp-2 transition-colors">
        {issue.title}
      </h3>

      {/* Labels + signals */}
      <div className="mt-auto flex items-center gap-3 min-h-[20px]">
        <div className="flex-1 min-w-0"><LabelsCellContent labels={issue.labels} /></div>
        <span
          className={`flex items-center gap-1 text-[11px] shrink-0 tabular ${issue.commentsCount === 0 ? 'text-green-400/80' : 'text-gray-500'}`}
          title={issue.commentsCount === 0 ? 'No comments yet — nobody has claimed it' : `${issue.commentsCount} comments`}
        >
          <MessageSquare className="w-3 h-3" />{issue.commentsCount}
        </span>
        <span className="text-[11px] text-gray-500 shrink-0 whitespace-nowrap">{formatRelativeDate(issue[dateField])}</span>
        <a
          href={issue.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="-my-1 -mr-1 w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:text-white hover:bg-white/[0.06] [@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all shrink-0"
          aria-label="Open on GitHub"
          title="Open on GitHub"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </article>
  );
});

IssueCard.displayName = 'IssueCard';
export default IssueCard;
