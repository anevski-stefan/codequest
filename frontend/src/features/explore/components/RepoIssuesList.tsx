import { CircleDot, ExternalLink, Loader2 } from 'lucide-react';
import { formatRelativeDate } from '../../../utils/formatDate';
import { getLabelColors } from '../../dashboard/utils/filterUtils';
import type { Issue } from '../../../types/github';

interface RepoIssuesListProps {
  issues: Issue[];
  isLoading: boolean;
  focusedIssueNumber: number | null;
  focusedIssueRef: React.Ref<HTMLDivElement>;
  onSelectIssue: (issue: Issue) => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

export function RepoIssuesList({
  issues,
  isLoading,
  focusedIssueNumber,
  focusedIssueRef,
  onSelectIssue,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: RepoIssuesListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse h-16 rounded-xl bg-[#0D1525] border border-white/[0.05]" />
        ))}
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CircleDot className="w-8 h-8 text-gray-700 mb-3" />
        <p className="text-sm text-gray-500">No open issues found</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {issues.map(issue => {
        const isFocused = issue.number === focusedIssueNumber;
        return (
          <div
            key={issue.id}
            ref={isFocused ? focusedIssueRef : undefined}
            onClick={() => onSelectIssue(issue)}
            className={`group flex items-start gap-3 px-4 py-3.5 rounded-xl border cursor-pointer transition-all ${
              isFocused
                ? 'border-blue-500/40 bg-blue-500/[0.06] ring-1 ring-blue-500/20'
                : 'border-white/[0.06] bg-[#0D1525] hover:border-white/[0.12] hover:bg-[#111927]'
            }`}
          >
            <CircleDot className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors leading-snug flex-1">
                  {issue.title}
                </span>
                <span className="text-[10px] text-gray-700 shrink-0">#{issue.number}</span>
              </div>
              {issue.labels?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {issue.labels.map((label: { name: string; color: string }) => (
                    <span
                      key={label.name}
                      className="px-1.5 py-0.5 text-[10px] font-medium rounded-full"
                      style={getLabelColors(label.color)}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-gray-700 mt-1.5">
                Opened {formatRelativeDate(issue.createdAt)} · {issue.commentsCount} comments
              </p>
            </div>
            <a
              href={issue.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-gray-700 hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-all shrink-0 mt-0.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        );
      })}

      {hasNextPage && (
        <div className="flex justify-center pt-3">
          <button
            onClick={fetchNextPage}
            disabled={isFetchingNextPage}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs text-gray-400 border border-white/[0.08] hover:border-white/[0.15] hover:text-white disabled:opacity-40 transition-all cursor-pointer"
          >
            {isFetchingNextPage
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Loading…</>
              : 'Load more issues'}
          </button>
        </div>
      )}
    </div>
  );
}
