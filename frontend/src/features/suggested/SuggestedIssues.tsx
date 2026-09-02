import { useState, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getSuggestedIssues } from '../../services/github';
import type { Issue, IssueParams } from '../../types/github';
import CommentsModal from '../../components/CommentsModal';
import { CardSkeleton } from '../../components/skeletons';
import { usePageTitle } from '../../hooks/usePageTitle';
import useIssueComments from '../../hooks/useIssueComments';
import IssueTable from '../dashboard/components/IssueTable';
const SuggestedIssues = () => {
  usePageTitle('Suggested Issues');
  const [filter, setFilter] = useState<IssueParams>({
    labels: ['good first issue', 'good-first-issue', 'help wanted', 'beginner friendly', 'first-timers-only'],
    sort: 'created',
    direction: 'desc',
    state: 'open',
    page: 1,
    language: '',
    timeFrame: 'month',
    unassigned: true,
    commentsRange: '0'
  });
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const [initialFetchComplete, setInitialFetchComplete] = useState(false);
  const {
    isCommentsModalOpen,
    allComments,
    isLoadingComments,
    hasMoreComments,
    isLoadingMore,
    onLoadMore,
    handleViewComments,
    handleCloseComments,
    handleAddComment
  } = useIssueComments();
  const {
    data,
    isLoading,
    isError,
    isPlaceholderData,
    error
  } = useQuery({
    queryKey: ['suggested-issues', filter],
    queryFn: () => getSuggestedIssues(filter),
    placeholderData: keepPreviousData,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 60000)
  });
  useEffect(() => {
    if (isPlaceholderData) return;
    if (isError) {
      console.error('Query error:', error);
      setInitialFetchComplete(true);
      return;
    }
    if (!data) return;
    if (filter.page === 1) {
      setAllIssues(data.issues);
    } else {
      setAllIssues(prev => {
        const existingIds = new Set(prev.map(issue => `${issue.repository?.fullName}-${issue.number}`));
        const newUniqueIssues = data.issues.filter((issue: Issue) => !existingIds.has(`${issue.repository?.fullName}-${issue.number}`));
        return [...prev, ...newUniqueIssues];
      });
    }
    setInitialFetchComplete(true);
  }, [isPlaceholderData, isError, error, data, filter.page]);
  const showLoadingSpinner = isLoading || !initialFetchComplete;
  const isRateLimitError = error instanceof Error && (error.message.includes('rate limit') || error.message.includes('secondary rate limit'));
  return <div className="w-full p-6 dark:bg-[#0B1222] mt-[64px]">
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
        {showLoadingSpinner && <div className="grid gap-6">
            <div className="w-full p-4 bg-white/80 dark:bg-[#0B1222]/80 backdrop-blur-lg border border-gray-200 dark:border-white/10 rounded-lg shadow">
              <CardSkeleton />
            </div>
            <div className="w-full p-4 bg-white/80 dark:bg-[#0B1222]/80 backdrop-blur-lg border border-gray-200 dark:border-white/10 rounded-lg shadow">
              <CardSkeleton />
            </div>
            <div className="w-full p-4 bg-white/80 dark:bg-[#0B1222]/80 backdrop-blur-lg border border-gray-200 dark:border-white/10 rounded-lg shadow">
              <CardSkeleton />
            </div>
          </div>}

        {!showLoadingSpinner && error instanceof Error && <div className="bg-white/80 dark:bg-[#0B1222]/80 backdrop-blur-lg border border-gray-200 dark:border-white/10 rounded-lg p-6 text-center">
            <p className="text-red-600 dark:text-red-400 mb-2">
              {isRateLimitError ? 'GitHub API rate limit exceeded' : 'Failed to load issues'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isRateLimitError ? 'Please wait a few minutes before trying again.' : error.message}
            </p>
          </div>}
        
        {!showLoadingSpinner && allIssues.length === 0 && initialFetchComplete && <div className="text-center p-8">
            <p className="text-gray-500 dark:text-gray-400">
              No issues found
            </p>
          </div>}

        {!showLoadingSpinner && allIssues.length > 0 && <div className="bg-white dark:bg-gray-900 shadow rounded-lg">
            <IssueTable issues={allIssues} onViewComments={handleViewComments} />
          </div>}

        {!showLoadingSpinner && data?.hasMore && allIssues.length > 0 && <div className="flex justify-center mt-4 md:mt-6">
            <button onClick={() => setFilter(prev => ({
          ...prev,
          page: prev.page + 1
        }))} className="w-full md:w-auto px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors text-sm md:text-base font-medium shadow-sm">
              Load More
            </button>
          </div>}
      </div>

      <CommentsModal isOpen={isCommentsModalOpen} onClose={handleCloseComments} comments={allComments} isLoading={isLoadingComments} onAddComment={handleAddComment} onLoadMore={onLoadMore} hasMoreComments={hasMoreComments} isLoadingMore={isLoadingMore} />
    </div>;
};
export default SuggestedIssues;