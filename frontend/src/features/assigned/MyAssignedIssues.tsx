import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAssignedIssues } from '../../services/github';
import { formatRelativeDate } from '../../utils/formatDate';
import { MessageCircle, ExternalLink, ChevronDown, GitPullRequest } from 'lucide-react';
import type { Issue } from '../../types/github';
import CommentsModal from '../../components/CommentsModal';
import { usePageTitle } from '../../hooks/usePageTitle';
import { CardSkeletonList } from '../../components/skeletons';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { getLabelColors } from '../dashboard/utils/filterUtils';
import useIssueComments from '../../hooks/useIssueComments';
import EmptyState from '../../components/ui/EmptyState';

const MyAssignedIssues = () => {
  usePageTitle('My Assigned Issues');
  const navigate = useNavigate();
  const [issueState, setIssueState] = useState<string>('open');

  const {
    isCommentsModalOpen, selectedIssue, allComments, isLoadingComments, hasMoreComments,
    isLoadingMore, onLoadMore, handleViewComments, handleCloseComments, handleAddComment
  } = useIssueComments();

  const { data, isLoading, error } = useQuery({
    queryKey: ['assignedIssues', issueState],
    queryFn: () => getAssignedIssues(issueState),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    retry: 2,
    select: data => ({
      issues: Array.isArray(data) ? data : data.issues || [],
    })
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="px-6 lg:px-8 pt-7 pb-4 border-b border-white/[0.05] shrink-0">
          <div className="skeleton h-6 w-40 mb-1.5" />
          <div className="skeleton h-3.5 w-24" />
        </div>
        <div className="px-4 lg:px-6 xl:px-8 py-4"><CardSkeletonList count={6} /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorDisplay title="Failed to load assigned issues" error={error instanceof Error ? error.message : 'An error occurred'} />
      </div>
    );
  }

  const issues: Issue[] = data?.issues ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="px-6 lg:px-8 pt-7 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-400/80 mb-1.5">Workspace</p>
            <h1 className="text-xl font-bold tracking-tight text-white">My Assigned Issues</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {issues.length > 0
                ? `${issues.length} ${issueState} issue${issues.length !== 1 ? 's' : ''}`
                : `No ${issueState} issues assigned`}
            </p>
          </div>

          {/* State toggle */}
          <div className="relative h-8 min-w-[96px]">
            <div className={`absolute inset-0 flex items-center gap-1.5 px-3 rounded-lg border text-[11px] font-semibold pointer-events-none ${
              issueState === 'open'
                ? 'border-green-500/30 bg-green-500/[0.07] text-green-300'
                : 'border-white/[0.09] bg-white/[0.04] text-gray-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${issueState === 'open' ? 'bg-green-400' : 'bg-gray-500'}`} />
              {issueState === 'open' ? 'Open' : 'Closed'}
              <ChevronDown className="w-3 h-3 ml-1 text-current opacity-60" />
            </div>
            <select
              aria-label="Issue state"
              value={issueState}
              onChange={e => setIssueState(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="border-b border-white/[0.05]" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {issues.length === 0 ? (
          <EmptyState icon={GitPullRequest} title={`No ${issueState} issues assigned to you`} subtitle="Pick something from Suggested Issues, comment to claim it, and it will be tracked here once a maintainer assigns you." />
        ) : (
          <div className="px-4 lg:px-6 xl:px-8 py-4 grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            {issues.map((issue: Issue, i: number) => {
              const [owner, repo] = (issue.repository?.fullName ?? '').split('/');
              const repoPath = owner && repo ? `/explore/${owner}/${repo}?issue=${issue.number}` : null;

              return (
                <div
                  key={issue.id}
                  style={{ '--i': i } as CSSProperties}
                  className="reveal group rounded-xl border border-white/[0.07] bg-[#2E3245] p-4 hover:border-white/[0.14] hover:bg-[#31364C] hover:-translate-y-px hover:shadow-[0_12px_24px_-12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-0 transition-[background-color,border-color,box-shadow,transform] duration-200 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                  onClick={() => repoPath && navigate(repoPath)}
                >
                  {/* Row 1: title + state badge */}
                  <div className="flex items-start gap-3 mb-2">
                    <p className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors line-clamp-2 leading-snug flex-1">
                      {issue.title}
                    </p>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold border shrink-0 ${
                      issue.state === 'open'
                        ? 'bg-green-500/[0.08] border-green-500/20 text-green-400'
                        : 'bg-white/[0.05] border-white/[0.09] text-gray-500'
                    }`}>
                      <span className={`w-1 h-1 rounded-full ${issue.state === 'open' ? 'bg-green-400' : 'bg-gray-500'}`} />
                      {issue.state}
                    </span>
                  </div>

                  {/* Row 2: number · repo · date */}
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-3">
                    <span className="font-mono text-gray-400">#{issue.number}</span>
                    <span className="text-gray-600">·</span>
                    {owner && repo ? (
                      <span className="truncate">
                        <span className="text-gray-500">{owner}/</span>
                        <span className="text-gray-300 font-medium">{repo}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400 truncate">{issue.repository?.fullName}</span>
                    )}
                    <span className="ml-auto text-gray-400 whitespace-nowrap shrink-0">{formatRelativeDate(issue.updatedAt)}</span>
                  </div>

                  {/* Row 3: labels + hover actions */}
                  <div className="flex items-center gap-2">
                    <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                      {issue.labels.slice(0, 4).map(label => (
                        <span
                          key={label.name}
                          className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-md whitespace-nowrap"
                          style={getLabelColors(label.color)}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                    <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); handleViewComments(issue); }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold text-blue-400 bg-blue-400/[0.08] hover:bg-blue-400/[0.15] border border-blue-400/20 transition-all cursor-pointer"
                        aria-label="View comments"
                      >
                        <MessageCircle size={11} />
                        {issue.commentsCount > 0 ? issue.commentsCount : 'Comments'}
                      </button>
                      <a
                        href={issue.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="p-1.5 rounded-md text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] transition-all"
                        aria-label="Open on GitHub"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isCommentsModalOpen && (
        <CommentsModal
          isOpen={isCommentsModalOpen}
          onClose={handleCloseComments}
          comments={allComments}
          isLoading={isLoadingComments}
          onAddComment={handleAddComment}
          onLoadMore={onLoadMore}
          hasMoreComments={hasMoreComments}
          isLoadingMore={isLoadingMore}
          issue={selectedIssue}
        />
      )}
    </div>
  );
};

export default MyAssignedIssues;
