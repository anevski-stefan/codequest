import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from 'react-query';
import { getIssues, getIssueComments, addIssueComment } from '../../services/github';
import type { 
  Issue, 
  IssueParams, 
  Language,
  IssueResponse 
} from '../../types/github';
import debounce from 'lodash/debounce';
import { SlidersHorizontal, X } from 'lucide-react';
import CommentsModal from '../../components/CommentsModal';
import LabelsFilter from '../../components/LabelsFilter';
import { FilterDropdown } from './components/FilterDropdown';
import { timeFrameOptions, sortOptions, commentRanges, languageOptions } from './constants/filterOptions';
import { usePageTitle } from '../../hooks/usePageTitle';
import IssueTable from './components/IssueTable';
import { CardSkeleton } from '../../components/skeletons';

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
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

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

  // Move debounce outside of component or use useMemo
  const debouncedSetFilter = useMemo(
    () => debounce((newFilter: IssueParams) => {
      console.log('Debounced setFilter executing with:', newFilter);
      setFilter(newFilter);
      setInitialFetchComplete(false);
    }, 500),
    []
  );

  const { data, isLoading, error } = useQuery<IssueResponse, Error>(
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
  const handleFilterChange = useCallback((newFilter: Partial<IssueParams>) => {
    setFilter(prev => ({
      ...prev,
      ...Object.fromEntries(
        Object.entries(newFilter).filter(([, value]) => value != null)
      )
    }));
  }, []);

  // Update filter change handlers
  const handleTimeFrameChange = useCallback((value: string) => {
    handleFilterChange({ timeFrame: value });
  }, [handleFilterChange]);

  const handleSortChange = useCallback((value: string) => {
    handleFilterChange({ 
      sort: value as Language, 
      direction: value === 'created-asc' ? 'asc' : 'desc' 
    });
  }, [handleFilterChange]);

  const handleCommentsRangeChange = useCallback((value: string) => {
    handleFilterChange({ commentsRange: value });
  }, [handleFilterChange]);

  const handleLanguageChange = useCallback((value: string) => {
    handleFilterChange({ language: value as Language });
  }, [handleFilterChange]);

  const handleLabelsChange = useCallback((labels: string[]) => {
    handleFilterChange({ labels });
  }, [handleFilterChange]);

  const handleUnassignedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFilterChange({ unassigned: e.target.checked });
  }, [handleFilterChange]);

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

  // Add cleanup effect
  useEffect(() => {
    return () => {
      debouncedSetFilter.cancel();
    };
  }, [debouncedSetFilter]);

  if (showLoadingSpinner) {
    return (
      <div className="mt-[64px] p-4 grid gap-6">
        {[1, 2, 3].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full relative mt-[64px]">
      {/* Mobile Filter Toggle Button */}
      <button
        onClick={() => setIsMobileFiltersOpen(true)}
        className="lg:hidden fixed bottom-4 right-4 z-50 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
      >
        <SlidersHorizontal className="w-6 h-6" />
      </button>

      {/* Mobile Filter Overlay */}
      <div
        className={`lg:hidden fixed inset-0 mt-[64px] bg-gray-900/50 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isMobileFiltersOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileFiltersOpen(false)}
      />

      {/* Left Sidebar with Filters - Modified for mobile */}
      <aside
        className={`
          fixed lg:sticky lg:top-[64px] inset-y-0 top-[64px] left-0 z-50 w-full lg:w-80 shrink-0 transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 ${isMobileFiltersOpen ? 'translate-x-0' : '-translate-x-full'}
          h-[calc(100vh-64px)] overflow-y-auto
        `}
      >
        <div className="h-full w-full lg:w-80 bg-white dark:bg-[#0B1222] lg:bg-transparent">
          <div className="p-4 sticky top-0 bg-white dark:bg-[#0B1222] z-10">
            {/* Mobile Close Button */}
            <div className="flex items-center justify-between lg:hidden mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h2>
              <button
                onClick={() => setIsMobileFiltersOpen(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Existing filter content */}
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
                      onChange={handleTimeFrameChange}
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
                      onChange={handleSortChange}
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
                      onChange={handleCommentsRangeChange}
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
                      onChange={handleLanguageChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Labels
                    </label>
                    <LabelsFilter
                      selectedLabels={filter.labels || []}
                      onLabelsChange={handleLabelsChange}
                    />
                  </div>

                  <div>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filter.unassigned}
                        onChange={handleUnassignedChange}
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

      {/* Main Content - Modified for mobile */}
      <main className="flex-1 p-4 lg:p-4 w-full lg:ml-0">
        <div className="w-full max-w-[1600px]">
          {showLoadingSpinner ? (
            <div className="grid gap-6">
              {[1, 2, 3].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="w-full">
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
                <div className="bg-white dark:bg-gray-900 shadow rounded-lg">
                  <IssueTable 
                    issues={allIssues}
                    onViewComments={handleViewComments}
                  />
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