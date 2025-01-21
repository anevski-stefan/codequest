import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from 'react-query';
import { getIssues, getIssueComments, addIssueComment } from '../../services/github';
import type { Issue, IssueParams, Language } from '../../types/github';
import debounce from 'lodash/debounce';
import CommentsModal from '../../components/CommentsModal';
import LabelsFilter from '../../components/LabelsFilter';
import LoadingSpinner from '../../components/LoadingSpinner';
import { FilterDropdown } from './components/FilterDropdown';
import { timeFrameOptions, sortOptions, commentRanges, languageOptions } from './constants/filterOptions';
import { usePageTitle } from '../../hooks/usePageTitle';
import IssueTable from './components/IssueTable';

const Dashboard = () => {
  usePageTitle('Dashboard');
  const [filter, setFilter] = useState<IssueParams>({
    language: '',
    sort: 'created',
    direction: 'desc',
    state: 'open',
    page: 1,
    timeFrame: 'all',
    unassigned: false,
    commentsRange: '',
    labels: []
  });
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
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
      console.log('Fetching comments with params:', {
        issueNumber: selectedIssueId,
        repo: selectedRepo,
        page: pageParam
      });
      if (selectedIssueId && selectedRepo) {
        const result = await getIssueComments(selectedIssueId, selectedRepo, pageParam);
        console.log('Comments API result:', {
          commentsCount: result.comments.length,
          totalCount: result.totalCount,
          hasMore: result.hasMore,
          nextPage: result.nextPage,
          firstComment: result.comments[0]
        });
        return result;
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

  // Update how we flatten comments to maintain order
  const allComments = commentsData?.pages?.flatMap(page => page?.comments ?? []) ?? [];
  console.log('Flattened comments:', allComments);

  // Add comment mutation
  const queryClient = useQueryClient();
  const addCommentMutation = useMutation({
    mutationFn: ({ issueId, comment }: { issueId: number; comment: string }) => {
      if (!selectedRepo) {
        throw new Error('No repository selected');
      }
      return addIssueComment(issueId, selectedRepo, comment);
    },
    onSuccess: () => {
      console.log('Comment added successfully, invalidating queries');
      // Invalidate and refetch comments
      queryClient.invalidateQueries(['comments', selectedIssueId, selectedRepo]);
    },
    onError: (error) => {
      console.error('Error in mutation:', error);
    }
  });

  // Debounced filter updates
  const debouncedSetFilter = useCallback(
    debounce((newFilter: IssueParams) => {
      console.log('Debounced setFilter executing with:', newFilter);
      setFilter(newFilter);
      setInitialFetchComplete(false);
    }, 500),
    []
  );

  const { data, isLoading, error } = useQuery<any, Error>(
    ['issues', filter],
    () => {
      console.log('Executing query with filter:', filter);
      return getIssues(filter);
    },
    {
      keepPreviousData: true,
      staleTime: 0,
      cacheTime: 300000,
      refetchOnWindowFocus: false,
      enabled: true,
      onSuccess: (newData) => {
        console.log('Query success:', { 
          totalIssues: newData.issues.length,
          hasMore: newData.hasMore,
          filter 
        });
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
        setIsFilterLoading(false);
        setInitialFetchComplete(true);
      },
      onError: (error) => {
        console.error('Query error:', error);
        setIsFilterLoading(false);
        setInitialFetchComplete(true);
      }
    }
  );

  // Update handleFilterChange to reset initialFetchComplete
  const handleFilterChange = (key: keyof IssueParams, value: string | boolean | string[]) => {
    console.log('Filter change:', { key, value });

    setIsFilterLoading(true);
    setInitialFetchComplete(false);
    const newFilter = { 
      ...filter,
      [key]: value,
      page: 1
    };

    // Special handling for sort with type guard
    if (key === 'sort' && typeof value === 'string') {
      console.log('Sort before:', { sort: newFilter.sort, direction: newFilter.direction });
      if (value === 'created-asc') {
        newFilter.sort = 'created';
        newFilter.direction = 'asc';
      } else if (value === 'comments') {
        newFilter.sort = 'comments';
        newFilter.direction = 'desc';
      } else {
        newFilter.sort = value;
        newFilter.direction = 'desc';
      }
      console.log('Sort after:', { sort: newFilter.sort, direction: newFilter.direction });
    }

    console.log('New filter:', newFilter);
    debouncedSetFilter(newFilter);
  };

  const handleLoadMore = () => {
    setFilter(prev => ({ ...prev, page: prev.page + 1 }));
  };

  const handleViewComments = (issue: Issue) => {
    console.log('Opening comments for issue:', {
      issueNumber: issue.number,
      repoFullName: issue.repository.fullName,
      totalComments: issue.commentsCount,
      issueTitle: issue.title
    });
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
    <div className="flex min-h-screen w-full">
      {/* Left Sidebar with Filters */}
      <aside className="w-80 shrink-0">
        <div className="fixed w-80">
          <div className="m-4">
            <div className="border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B1222] rounded-lg">
              <div className="p-4 border-b border-gray-200 dark:border-white/10">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Filters
                </h2>
              </div>
              <div className="p-4 pb-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Time Frame
                    </label>
                    <FilterDropdown
                      label="Time Frame"
                      options={timeFrameOptions}
                      value={filter.timeFrame}
                      onChange={(value) => handleFilterChange('timeFrame', value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Sort By
                    </label>
                    <FilterDropdown
                      label="Sort By"
                      options={sortOptions}
                      value={filter.direction === 'asc' ? 'created-asc' : filter.sort}
                      onChange={(value) => handleFilterChange('sort', value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Comments
                    </label>
                    <FilterDropdown
                      label="Comments"
                      options={commentRanges}
                      value={filter.commentsRange}
                      onChange={(value) => handleFilterChange('commentsRange', value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Language
                    </label>
                    <FilterDropdown
                      label="Language"
                      options={[
                        { value: '', label: 'All Languages' },
                        ...languageOptions.slice(1).map(lang => ({
                          value: lang,
                          label: lang.charAt(0).toUpperCase() + lang.slice(1)
                        }))
                      ]}
                      value={filter.language}
                      onChange={(value) => handleFilterChange('language', value as Language)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Labels
                    </label>
                    <LabelsFilter
                      selectedLabels={filter.labels || []}
                      onLabelsChange={(labels) => handleFilterChange('labels', labels)}
                    />
                  </div>

                  <div>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filter.unassigned}
                        onChange={(e) => handleFilterChange('unassigned', e.target.checked)}
                        className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
                      />
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">Unassigned only</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 overflow-x-auto">
        <div className="min-h-[200px] w-full">
          {showLoadingSpinner ? (
            <LoadingSpinner />
          ) : (
            <div className="min-h-[200px] w-full">
              {error instanceof Error && (
                <div className="text-center text-red-600 dark:text-red-400 p-3 md:p-4 mb-4 rounded-lg w-full">
                  {error.message || 'Failed to load issues'}
                </div>
              )}
              
              {!isLoading && !isFilterLoading && !error && allIssues.length === 0 && initialFetchComplete && (
                <div className="text-center p-8">
                  <p className="text-gray-500 dark:text-gray-400">
                    No issues found
                  </p>
                </div>
              )}

              {!isLoading && !isFilterLoading && allIssues.length > 0 && (
                <div className="bg-white dark:bg-gray-900 shadow rounded-lg overflow-hidden">
                  <div className="min-w-full overflow-x-auto">
                    <IssueTable 
                      issues={allIssues}
                      onViewComments={handleViewComments}
                    />
                  </div>
                </div>
              )}

              {!isLoading && !isFilterLoading && data?.hasMore && allIssues.length > 0 && (
                <div className="flex justify-center mt-4 md:mt-6">
                  <button
                    onClick={handleLoadMore}
                    className="w-full md:w-auto px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors text-sm md:text-base font-medium shadow-sm"
                  >
                    Load More
                  </button>
                </div>
              )}

              {!isLoading && !isFilterLoading && !data?.hasMore && allIssues.length > 0 && (
                <div className="text-center text-gray-600 dark:text-gray-400 py-4 md:py-8">
                  No more issues to load
                </div>
              )}
            </div>
          )}
        </div>
      </main>

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

export default Dashboard; 