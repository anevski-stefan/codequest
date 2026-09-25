import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { GitPullRequest, Sparkles } from 'lucide-react';
import { getAssignedIssues } from '../../services/github';
import type { Issue } from '../../types/github';
import IssueDetailsModal from '../../components/IssueDetailsModal';
import IssueCard from '../../components/issues/IssueCard';
import { usePageTitle } from '../../hooks/usePageTitle';
import { CardSkeletonList } from '../../components/skeletons';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import useIssueComments from '../../hooks/useIssueComments';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import SegmentedControl from '../../components/ui/SegmentedControl';

type IssueState = 'open' | 'closed';

const MyAssignedIssues = () => {
  usePageTitle('My Assigned Issues');
  const [issueState, setIssueState] = useState<IssueState>('open');

  const {
    isCommentsModalOpen, selectedIssue, allComments, isLoadingComments, hasMoreComments,
    isLoadingMore, onLoadMore, prefetchComments, handleViewComments, handleCloseComments, handleAddComment,
  } = useIssueComments();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['assignedIssues', issueState],
    queryFn: () => getAssignedIssues(issueState),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    retry: 2,
    select: data => ({
      issues: Array.isArray(data) ? data : data.issues || [],
    }),
  });

  const issues: Issue[] = data?.issues ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 lg:px-8 pt-7 shrink-0">
        <PageHeader
          eyebrow="Workspace"
          title="Assigned to you"
          subtitle={isLoading
            ? 'Loading your work'
            : issues.length > 0
              ? <span className="tabular">{issues.length} {issueState} issue{issues.length !== 1 ? 's' : ''}</span>
              : `No ${issueState} issues`}
          actions={
            <SegmentedControl
              label="Issue state"
              value={issueState}
              onChange={setIssueState}
              options={[{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }]}
            />
          }
        />
        <div className="border-b border-white/[0.05]" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="px-4 lg:px-6 xl:px-8 py-4"><CardSkeletonList count={6} /></div>
        ) : error ? (
          <div className="p-6">
            <ErrorDisplay
              title="Couldn't load your assigned issues"
              error={error instanceof Error ? error.message : 'An error occurred'}
              onRetry={() => refetch()}
            />
          </div>
        ) : issues.length === 0 ? (
          <EmptyState
            icon={GitPullRequest}
            title={issueState === 'open' ? 'Nothing assigned yet' : 'No closed issues yet'}
            subtitle={issueState === 'open'
              ? 'Pick an issue, comment that you want to take it, and it lands here once a maintainer assigns you.'
              : 'Issues you finish will be collected here as a record of your work.'}
            action={issueState === 'open' ? (
              <Link to="/suggested" className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-[13px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] active:scale-[0.97] transition-all">
                <Sparkles className="w-3.5 h-3.5" />
                Find an issue for you
              </Link>
            ) : undefined}
          />
        ) : (
          <div className="px-4 lg:px-6 xl:px-8 py-4 grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            {issues.map((issue, i) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                index={i}
                dateField="updatedAt"
                onOpen={handleViewComments}
                onPrefetch={prefetchComments}
              />
            ))}
          </div>
        )}
      </div>

      <IssueDetailsModal
        isOpen={isCommentsModalOpen}
        onClose={handleCloseComments}
        issue={selectedIssue}
        comments={allComments}
        isLoadingComments={isLoadingComments}
        hasMoreComments={hasMoreComments}
        isLoadingMore={isLoadingMore}
        onLoadMore={onLoadMore}
        onAddComment={handleAddComment}
      />
    </div>
  );
};

export default MyAssignedIssues;
