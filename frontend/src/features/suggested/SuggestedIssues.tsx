import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from 'react-query';
import { getSuggestedIssues, getIssueComments, addIssueComment } from '../../services/github';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare } from 'lucide-react';
import type { Issue, IssueParams } from '../../types/github';
import CommentsModal from '../../components/CommentsModal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getStateColor, getLabelColors } from '../dashboard/utils/filterUtils';
import { usePageTitle } from '../../hooks/usePageTitle';

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
    <div className="w-full p-6 dark:bg-[#0B1222]">
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
            
            {allIssues?.length > 0 && (
              <div className="space-y-3 md:space-y-4">
                {allIssues.map((issue) => (
                  <div 
                    key={`${issue.repository?.fullName}-${issue.number}`} 
                    className="relative py-3 md:py-4 group"
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gray-50/5 dark:bg-white/5 transition-opacity rounded-lg" />
                    <div className="relative">
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col md:flex-row md:items-start justify-between">
                          <div className="flex-1">
                            <a 
                              href={issue.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-sm md:text-base font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                            >
                              {issue.title}
                            </a>
                            <p className="mt-0.5 text-xs md:text-sm text-gray-500 dark:text-gray-400">
                              {issue.repository?.fullName} #{issue.number}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2 md:mt-0 md:ml-4">
                            {issue.labels.map((label) => (
                              <span
                                key={label.name}
                                className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap max-w-[120px]"
                                style={getLabelColors(label.color)}
                                title={label.name}
                              >
                                <span className="truncate">
                                  {label.name.length > 20 ? `${label.name.slice(0, 20)}...` : label.name}
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-0 text-sm">
                          <div className="flex flex-wrap md:flex-nowrap items-center gap-2 md:space-x-4 text-gray-500 dark:text-gray-400">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${getStateColor(issue.state)}`}>
                              <span className={`w-2 h-2 rounded-full mr-2 ${
                                issue.state === 'open' ? 'bg-green-500' : 'bg-purple-500'
                              }`} />
                              {issue.state}
                            </span>
                            <span className="hidden md:inline">•</span>
                            <span className="text-xs md:text-sm">
                              Created {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
                            </span>
                            <span className="hidden md:inline">•</span>
                            <span className="text-xs md:text-sm">
                              {issue.commentsCount} comments
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 md:space-x-3">
                            <button
                              onClick={() => handleViewComments(issue)}
                              className="flex-1 md:flex-none inline-flex items-center justify-center px-3 py-1.5 text-xs md:text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-md transition-colors"
                            >
                              <MessageSquare size={14} className="mr-1.5" />
                              View Comments
                            </button>
                            <a 
                              href={issue.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="flex-1 md:flex-none inline-flex items-center justify-center px-3 py-1.5 text-xs md:text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-md transition-colors"
                            >
                              View on GitHub
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && !error && allIssues.length === 0 && initialFetchComplete && (
              <div className="text-center p-8">
                <p className="text-gray-500 dark:text-gray-400">
                  No issues found
                </p>
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