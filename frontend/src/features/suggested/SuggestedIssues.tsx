import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from 'react-query';
import { getSuggestedIssues, getIssueComments, addIssueComment } from '../../services/github';
import type { Issue, IssueParams } from '../../types/github';
import CommentsModal from '../../components/CommentsModal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { usePageTitle } from '../../hooks/usePageTitle';
import IssueTable from '../dashboard/components/IssueTable';

const SuggestedIssues = () => {
  usePageTitle('Suggested Issues');
  // Initial state with good first issue labels
  const [filter, setFilter] = useState<IssueParams>({
    // Using the most common beginner labels (limiting to top 5 to avoid query complexity issues)
    labels: [
      'good first issue',
      'good-first-issue',
      'help wanted',
      'beginner friendly',
      'first-timers-only'
    ],
    sort: 'created',
    direction: 'desc',
    state: 'open',
    page: 1,
    language: '',
    timeFrame: 'month',
    unassigned: true,
    commentsRange: '0'
  });

  // State management
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [initialFetchComplete, setInitialFetchComplete] = useState(false);

  // Comments query
  const { 
    data: commentsData, 
    isLoading: isLoadingComments, 
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage
  } = useInfiniteQuery(
    ['comments', selectedIssueId, selectedRepo],
    async ({ pageParam = 1 }) => {
      if (selectedIssueId && selectedRepo) {
        return await getIssueComments(selectedIssueId, selectedRepo, pageParam);
      }
      return null;
    },
    {
      enabled: !!selectedIssueId && !!selectedRepo,
      getNextPageParam: (lastPage) => {
        if (!lastPage) return undefined;
        return lastPage.hasMore ? lastPage.nextPage : undefined;
      },
    }
  );

  const allComments = commentsData?.pages?.flatMap(page => page?.comments ?? []) ?? [];

  // Add comment mutation
  const queryClient = useQueryClient();
  const addCommentMutation = useMutation({
    mutationFn: ({ issueId, comment }: { issueId: number; comment: string }) => {
      if (!selectedRepo) throw new Error('No repository selected');
      return addIssueComment(issueId, selectedRepo, comment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['comments', selectedIssueId, selectedRepo]);
    }
  });

  // Issues query
  const { data, isLoading, error } = useQuery(
    ['suggested-issues', filter],
    () => getSuggestedIssues(filter),
    {
      keepPreviousData: true,
      onSuccess: (newData) => {
        if (filter.page === 1) {
          setAllIssues(newData.issues);
        } else {
          setAllIssues(prev => {
            const existingIds = new Set(prev.map(issue => `${issue.repository?.fullName}-${issue.number}`));
            const newUniqueIssues = newData.issues.filter(
              (issue: Issue) => !existingIds.has(`${issue.repository?.fullName}-${issue.number}`)
            );
            return [...prev, ...newUniqueIssues];
          });
        }
        setInitialFetchComplete(true);
      }
    }
  );

  // Comments handling
  const handleViewComments = (issue: Issue) => {
    setSelectedIssueId(issue.number);
    setSelectedRepo(issue.repository.fullName);
    setIsCommentsModalOpen(true);
  };

  const handleAddComment = async (comment: string) => {
    if (!selectedIssueId) return;
    try {
      await addCommentMutation.mutateAsync({
        issueId: selectedIssueId,
        comment
      });
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const showLoadingSpinner = isLoading || !initialFetchComplete;

  return (
    <div className="w-full p-6 dark:bg-[#0B1222] mt-12">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        Suggested Issues for Beginners
      </h1>
      <div className="w-full mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h2 className="text-lg font-semibold mb-2 text-blue-800 dark:text-blue-200">
          Tips for Getting Started
        </h2>
        <ul className="list-disc list-inside text-blue-700 dark:text-blue-300 space-y-2">
          <li>These issues are tagged as beginner-friendly</li>
          <li>Read the issue description and requirements carefully</li>
          <li>Don't hesitate to ask questions in the comments</li>
          <li>Take your time to understand the codebase</li>
        </ul>
      </div>

      <div className="w-full min-h-[200px]">
        {showLoadingSpinner ? (
          <LoadingSpinner />
        ) : (
          <>
            {error instanceof Error && (
              <div className="text-center text-red-600 dark:text-red-400 p-3 md:p-4 mb-4 rounded-lg w-full">
                {error.message || 'Failed to load issues'}
              </div>
            )}
            
            {!isLoading && !error && allIssues.length === 0 && initialFetchComplete && (
              <div className="text-center p-8">
                <p className="text-gray-500 dark:text-gray-400">
                  No issues found
                </p>
              </div>
            )}

            {!isLoading && allIssues.length > 0 && (
              <div className="bg-white dark:bg-gray-900 shadow rounded-lg">
                <IssueTable 
                  issues={allIssues}
                  onViewComments={handleViewComments}
                />
              </div>
            )}

            {!isLoading && data?.hasMore && allIssues.length > 0 && (
              <div className="flex justify-center mt-4 md:mt-6">
                <button
                  onClick={() => setFilter(prev => ({ ...prev, page: prev.page + 1 }))}
                  className="w-full md:w-auto px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors text-sm md:text-base font-medium shadow-sm"
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <CommentsModal
        isOpen={isCommentsModalOpen}
        onClose={() => {
          setIsCommentsModalOpen(false);
          setSelectedIssueId(null);
        }}
        comments={allComments}
        isLoading={isLoadingComments}
        onAddComment={handleAddComment}
        onLoadMore={() => fetchNextPage()}
        hasMoreComments={!!hasNextPage}
        isLoadingMore={isFetchingNextPage}
      />
    </div>
  );
};

export default SuggestedIssues; 