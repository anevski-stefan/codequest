import type { CSSProperties } from 'react';
import { CircleDot, ArrowUpRight, MessageSquare } from 'lucide-react';
import { formatRelativeDate } from '../../../utils/formatDate';
import { getLabelColors } from '../../dashboard/utils/filterUtils';
import type { Issue } from '../../../types/github';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ErrorDisplay } from '../../../components/ui/ErrorDisplay';
import EmptyState from '../../../components/ui/EmptyState';
import LoadMoreButton from '../../../components/ui/LoadMoreButton';
import ClaimBadge from '../../../components/issues/ClaimBadge';
import useIssueClaims, { claimFor } from '../../../hooks/useIssueClaims';

interface RepoIssuesListProps {
  issues: Issue[];
  isLoading: boolean;
  isError?: boolean;
  error?: string;
  focusedIssueNumber: number | null;
  focusedIssueRef: React.Ref<HTMLDivElement>;
  onSelectIssue: (issue: Issue) => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

// Dense, GitHub-style list: inside a repository the repo name is implied,
// so rows spend their width on the title and signals instead.
export function RepoIssuesList({
  issues, isLoading, isError, error, focusedIssueNumber, focusedIssueRef,
  onSelectIssue, hasNextPage, isFetchingNextPage, fetchNextPage,
}: RepoIssuesListProps) {
  const { claims, loading: claimsLoading } = useIssueClaims(issues);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/[0.07] bg-[#2E3245]/60 divide-y divide-white/[0.05]" role="status" aria-label="Loading issues">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-3 px-4 py-3.5">
            <Skeleton className="w-3.5 h-3.5 rounded-full mt-0.5" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return <ErrorDisplay title="Couldn't load issues" error={error ?? 'Please try again.'} />;
  }

  if (issues.length === 0) {
    return <EmptyState icon={CircleDot} title="No open issues" subtitle="This repository has no open issues right now. Check the pull requests tab to see what's being worked on." />;
  }

  return (
    <>
      <div className="rounded-xl border border-white/[0.07] bg-[#2E3245] divide-y divide-white/[0.05] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        {issues.map((issue, i) => {
          const isFocused = issue.number === focusedIssueNumber;
          return (
            <div
              key={issue.id}
              ref={isFocused ? focusedIssueRef : undefined}
              role="button"
              tabIndex={0}
              style={{ '--i': i % 30 } as CSSProperties}
              onClick={() => onSelectIssue(issue)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectIssue(issue); } }}
              className={`reveal group relative flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors ${
                isFocused ? 'bg-blue-500/[0.07]' : 'hover:bg-white/[0.03]'
              }`}
            >
              {isFocused && <span className="absolute left-0 inset-y-0 w-[3px] bg-blue-400" aria-hidden="true" />}
              <CircleDot className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-gray-100 group-hover:text-white leading-snug transition-colors">
                  {issue.title}
                  {issue.labels?.map(label => (
                    <span
                      key={label.name}
                      className="inline-block align-middle ml-1.5 px-1.5 py-px text-[10px] font-semibold rounded-md"
                      style={getLabelColors(label.color)}
                    >
                      {label.name}
                    </span>
                  ))}
                </p>
                <p className="mt-1 text-[12px] text-gray-500">
                  <span className="font-mono">#{issue.number}</span> opened {formatRelativeDate(issue.createdAt)} by {issue.user?.login}
                </p>
              </div>
              <span className="shrink-0 mt-px"><ClaimBadge claim={claimFor(claims, issue)} loading={claimsLoading} /></span>
              <span className="flex items-center gap-1 text-[12px] shrink-0 mt-0.5 tabular text-gray-500">
                <MessageSquare className="w-3.5 h-3.5" />{issue.commentsCount}
              </span>
              <a
                href={issue.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                aria-label="Open on GitHub"
                className="-my-1 w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:text-white hover:bg-white/[0.06] [@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all shrink-0"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          );
        })}
      </div>
      {hasNextPage && <LoadMoreButton onClick={fetchNextPage} isLoading={isFetchingNextPage} />}
    </>
  );
}
