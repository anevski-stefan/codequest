import { useState } from 'react';
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
    return <div className="p-6"><CardSkeletonList count={3} /></div>;
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
      <div className="px-6 pt-6 pb-4 border-b border-white/[0.05] shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">My Assigned Issues</h1>
            <p className="text-xs text-gray-600 mt-0.5">
              {issues.length > 0 ? `${issues.length} ${issueState} issue${issues.length !== 1 ? 's' : ''}` : `No ${issueState} issues assigned`}
            </p>
          </div>

          {/* State filter chip */}
          <div className="relative h-8 min-w-[96px]">
            <div className={`absolute inset-0 flex items-center gap-1.5 px-3 rounded-lg border text-xs font-medium pointer-events-none ${
              issueState === 'open'
                ? 'border-green-500/30 bg-green-500/[0.07] text-green-300'
                : 'border-purple-500/30 bg-purple-500/[0.07] text-purple-300'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${issueState === 'open' ? 'bg-green-400' : 'bg-purple-400'}`} />
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
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {issues.length === 0 ? (
          <EmptyState icon={GitPullRequest} title={`No ${issueState} issues assigned to you`} subtitle="Issues you're assigned to will appear here" />
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {issues.map((issue: Issue) => {
              const [owner, repo] = (issue.repository?.fullName ?? '').split('/');
              const repoPath = owner && repo ? `/explore/${owner}/${repo}?issue=${issue.number}` : null;

              return (
                <div
                  key={issue.id}
                  className="px-6 py-4 hover:bg-white/[0.02] transition-colors group"
                >
                  {/* Top row: title + labels */}
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <button
                      onClick={() => repoPath && navigate(repoPath)}
                      className="text-sm font-semibold text-gray-200 hover:text-white text-left leading-snug cursor-pointer transition-colors"
                    >
                      {issue.title}
                    </button>
                    <div className="flex flex-wrap gap-1.5 shrink-0">
                      {issue.labels.map(label => (
                        <span
                          key={label.name}
                          className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-md whitespace-nowrap"
                          style={getLabelColors(label.color)}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Repo + number */}
                  <p className="text-xs text-gray-600 mb-3">
                    {issue.repository?.fullName} <span className="text-gray-700">·</span> #{issue.number}
                  </p>

                  {/* Bottom row: meta + actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${issue.state === 'open' ? 'bg-green-400' : 'bg-purple-400'}`} />
                        {issue.state}
                      </span>
                      <span className="text-gray-700">·</span>
                      <span>Updated {formatRelativeDate(issue.updatedAt)}</span>
                      <span className="text-gray-700">·</span>
                      <span>{issue.commentsCount} comments</span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleViewComments(issue)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all cursor-pointer"
                      >
                        <MessageCircle size={12} />
                        Comments
                      </button>
                      <a
                        href={issue.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-all"
                      >
                        <ExternalLink size={12} />
                        GitHub
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
