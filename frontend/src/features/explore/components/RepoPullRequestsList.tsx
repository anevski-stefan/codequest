import { GitPullRequest, GitCommit, FileText, Plus, Minus, MessageSquare, Loader2 } from 'lucide-react';
import { formatRelativeDate } from '../../../utils/formatDate';
import { getLabelColors } from '../../dashboard/utils/filterUtils';
import type { PullRequest, PullRequestCounts } from '../types';

interface RepoPullRequestsListProps {
  pullRequests: PullRequest[];
  isLoading: boolean;
  prState: 'open' | 'closed';
  setPrState: (s: 'open' | 'closed') => void;
  prCounts?: PullRequestCounts;
  isSwitching: boolean;
  setIsSwitching: (v: boolean) => void;
  currentTotalCount: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  onViewPullRequest: (prNumber: number) => void;
  onPrefetchPRDetails: (pr: PullRequest) => void;
}

export function RepoPullRequestsList({
  pullRequests,
  isLoading,
  prState,
  setPrState,
  prCounts,
  isSwitching,
  setIsSwitching,
  currentTotalCount,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  onViewPullRequest,
  onPrefetchPRDetails,
}: RepoPullRequestsListProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-600">{currentTotalCount} {prState} pull requests</p>
        <div className="flex items-center rounded-lg bg-white/[0.04] border border-white/[0.08] p-0.5">
          {(['open', 'closed'] as const).map(s => (
            <button
              key={s}
              onClick={() => { if (prState !== s) { setIsSwitching(true); setPrState(s); } }}
              disabled={prState === s || isSwitching}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                prState === s
                  ? 'bg-[#2E3245] text-white border border-white/[0.08] shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {s === 'open' ? `Open (${prCounts?.open ?? 0})` : `Closed (${prCounts?.closed ?? 0})`}
            </button>
          ))}
        </div>
      </div>

      {isSwitching || (isLoading && pullRequests.length === 0) ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse h-20 rounded-xl bg-[#2E3245] border border-white/[0.05]" />
          ))}
        </div>
      ) : pullRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <GitPullRequest className="w-8 h-8 text-gray-500 mb-3" />
          <p className="text-sm text-gray-500">No {prState} pull requests found</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {pullRequests.map(pr => (
            <div
              key={pr.id}
              className="group flex flex-col gap-3 px-4 py-4 rounded-xl bg-[#2E3245] border border-white/[0.06] hover:border-white/[0.12] hover:bg-[#363B52] transition-all"
            >
              <div className="flex items-start gap-3">
                <img src={pr.user.avatar_url} alt={pr.user.login} width={24} height={24}
                  loading="lazy" decoding="async" className="w-6 h-6 rounded-full shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => onViewPullRequest(pr.number)}
                      onMouseEnter={() => onPrefetchPRDetails(pr)}
                      className="flex-1 text-sm font-medium text-gray-200 hover:text-white text-left leading-snug cursor-pointer transition-colors"
                    >
                      {pr.title}
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {pr.draft && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-white/[0.06] border border-white/[0.08] text-gray-500">
                          Draft
                        </span>
                      )}
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full border ${
                        pr.merged_at
                          ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                          : pr.state === 'open'
                            ? 'text-green-400 bg-green-500/10 border-green-500/20'
                            : 'text-gray-400 bg-white/[0.05] border-white/[0.08]'
                      }`}>
                        {pr.merged_at ? 'Merged' : pr.state}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    #{pr.number} · {pr.user.login} · {formatRelativeDate(pr.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-9">
                {[
                  { icon: GitCommit, val: pr.commits || 0, label: 'commits' },
                  { icon: FileText, val: pr.changed_files || 0, label: 'files' },
                ].map(({ icon: Icon, val, label }) => (
                  <span key={label} className="flex items-center gap-1 text-[11px] text-gray-600">
                    <Icon className="w-3 h-3" />{val.toLocaleString()} {label}
                  </span>
                ))}
                <span className="flex items-center gap-1 text-[11px] text-green-600">
                  <Plus className="w-3 h-3" />{(pr.additions || 0).toLocaleString()}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-red-700">
                  <Minus className="w-3 h-3" />{(pr.deletions || 0).toLocaleString()}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-gray-600">
                  <MessageSquare className="w-3 h-3" />
                  {((pr.comments || 0) + (pr.review_comments || 0)).toLocaleString()}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-mono text-gray-500">
                  {pr.base.ref} ← {pr.head.ref}
                </span>
              </div>

              {pr.labels?.length > 0 && (
                <div className="flex flex-wrap gap-1 pl-9">
                  {pr.labels.map((label: { name: string; color: string }) => (
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

              {pr.requested_reviewers?.length > 0 && (
                <div className="flex items-center gap-2 pl-9">
                  <span className="text-[10px] text-gray-500">Reviewers:</span>
                  <div className="flex -space-x-1.5">
                    {pr.requested_reviewers.map((r: { login: string; avatar_url: string }) => (
                      <img
                        key={r.login}
                        src={r.avatar_url}
                        alt={r.login}
                        title={r.login}
                        width={20}
                        height={20}
                        loading="lazy"
                        decoding="async"
                        className="w-5 h-5 rounded-full ring-1 ring-[#2E3245]"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {hasNextPage && (
            <div className="flex justify-center pt-3">
              <button
                onClick={fetchNextPage}
                disabled={isFetchingNextPage}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs text-gray-400 border border-white/[0.08] hover:border-white/[0.15] hover:text-white disabled:opacity-40 transition-all cursor-pointer"
              >
                {isFetchingNextPage
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Loading…</>
                  : `Load more (${pullRequests.length} of ${currentTotalCount})`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
