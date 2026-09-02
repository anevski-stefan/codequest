import { useState } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAssignedIssues, getIssueComments, addIssueComment } from '../services/github';
import { formatRelativeDate } from '../utils/formatDate';
import { MessageCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Issue } from '../types/github';
import CommentsModal from './CommentsModal';
import { usePageTitle } from '../hooks/usePageTitle';
import { CardSkeleton } from './skeletons';
import { getLabelColors } from '../features/dashboard/utils/filterUtils';
const MyAssignedIssues = () => {
  usePageTitle('My Assigned Issues');
  const [issueState, setIssueState] = useState<string>('open');
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const {
    data: commentsData,
    isLoading: isLoadingComments,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage
  } = useInfiniteQuery({
    queryKey: ['assignedComments', selectedIssueId, selectedRepo],
    queryFn: async ({
      pageParam = 1
    }) => {
      if (selectedIssueId && selectedRepo) {
        const result = await getIssueComments(selectedIssueId, selectedRepo, pageParam);
        return result;
      }
      return null;
    },
    initialPageParam: 1,
    enabled: !!selectedIssueId && !!selectedRepo,
    getNextPageParam: lastPage => {
      if (!lastPage) return undefined;
      return lastPage.hasMore ? lastPage.nextPage : undefined;
    }
  });
  const allComments = commentsData?.pages?.flatMap(page => page?.comments ?? []) ?? [];
  const addCommentMutation = useMutation({
    mutationFn: ({
      issueId,
      comment
    }: {
      issueId: number;
      comment: string;
    }) => {
      if (!selectedRepo) {
        throw new Error('No repository selected');
      }
      return addIssueComment(issueId, selectedRepo, comment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignedComments', selectedIssueId, selectedRepo] });
      toast.success('Comment added');
    },
    onError: error => {
      console.error('Error in add comment mutation:', error);
      const message = error instanceof Error ? error.message : 'Failed to add comment';
      toast.error(message || 'Failed to add comment');
    }
  });
  const {
    data,
    isLoading,
    error
  } = useQuery({
    queryKey: ['assignedIssues', issueState],
    queryFn: () => getAssignedIssues(issueState),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    retry: 2,
    select: data => ({
      issues: Array.isArray(data) ? data : data.issues || [],
      totalCount: Array.isArray(data) ? data.length : data.issues?.length || 0,
      currentPage: 1,
      hasMore: false
    })
  });
  const handleOpenComments = (issue: Issue) => {
    setSelectedIssueId(issue.number);
    setSelectedRepo(issue.repository.fullName);
    setIsCommentsModalOpen(true);
  };
  const handleAddComment = async (comment: string) => {
    if (!selectedIssueId) return;
    await addCommentMutation.mutateAsync({
      issueId: selectedIssueId,
      comment
    });
  };
  const closeComments = () => {
    setIsCommentsModalOpen(false);
    setSelectedIssueId(null);
    setSelectedRepo(null);
  };
  if (isLoading) {
    return <div className="mt-[64px] p-4 grid gap-6">
        {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
      </div>;
  }
  if (error) {
    return <div className="mt-[64px] w-full text-center text-red-600 dark:text-red-400 p-4">
        {error instanceof Error ? error.message : 'Failed to load assigned issues'}
      </div>;
  }
  return <div className="w-full p-4">
      <div className="bg-white/80 dark:bg-[#0B1222]/80 backdrop-blur-lg border border-gray-200 dark:border-white/10 rounded-lg shadow">
        <div className="flex justify-between items-center mb-6 p-6 border-b border-gray-200 dark:border-white/10">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">My Assigned Issues</h1>
          <select aria-label="Issue state" value={issueState} onChange={e => setIssueState(e.target.value)} className="px-3 py-1.5 text-sm border rounded-md bg-white/80 dark:bg-[#0B1222]/80 backdrop-blur-lg text-gray-900 dark:text-white border-gray-200 dark:border-white/10 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {data?.issues && data.issues.length > 0 ? <div className="divide-y divide-gray-200 dark:divide-white/10">
            {data.issues.map((issue: Issue) => <div key={issue.id} className="p-4 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1">
                      <a href={issue.url} target="_blank" rel="noopener noreferrer" className="text-base font-medium text-gray-900 dark:text-white hover:text-blue-600">
                        {issue.title}
                      </a>
                      <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                        {issue.repository?.fullName} #{issue.number}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {issue.labels.map(label => <span key={label.name} className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full whitespace-nowrap" style={getLabelColors(label.color)}>
                          {label.name}
                        </span>)}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-gray-500 dark:text-gray-400">
                      <span className="inline-flex items-center">
                        <span className={`w-2 h-2 rounded-full mr-2 ${issue.state === 'open' ? 'bg-green-500' : 'bg-purple-500'}`} />
                        {issue.state}
                      </span>
                      <span className="hidden sm:inline">•</span>
                      <span>
                        Updated {formatRelativeDate(issue.updatedAt)}
                      </span>
                      <span className="hidden sm:inline">•</span>
                      <span>
                        {issue.commentsCount} comments
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => handleOpenComments(issue)} className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-md transition-colors">
                        <MessageCircle size={14} className="mr-1.5" />
                        View Comments
                      </button>
                      <a href={issue.url} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-md transition-colors">
                        View on GitHub
                      </a>
                    </div>
                  </div>
                </div>
              </div>)}
          </div> : <div className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No {issueState} issues assigned to you
            </p>
          </div>}

{selectedIssueId && <CommentsModal isOpen={isCommentsModalOpen} onClose={() => {
        closeComments();
      }} comments={allComments} isLoading={isLoadingComments} onAddComment={handleAddComment} onLoadMore={() => fetchNextPage()} hasMoreComments={!!hasNextPage} isLoadingMore={isFetchingNextPage} />}
      </div>
    </div>;
};
export default MyAssignedIssues;