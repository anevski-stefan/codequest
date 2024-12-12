import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from 'react-query';
import { getIssues, getIssueComments, addIssueComment } from '../../services/github';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare } from 'lucide-react';
import type { Issue, IssueParams, Language } from '../../types/github';
import debounce from 'lodash/debounce';
import CommentsModal from '../../components/CommentsModal';
import LabelsFilter from '../../components/LabelsFilter';
import LoadingSpinner from '../../components/LoadingSpinner';
import { FilterDropdown } from './components/FilterDropdown';
import { timeFrameOptions, sortOptions, commentRanges, languageOptions } from './constants/filterOptions';
import { getStateColor, getLabelColors } from './utils/filterUtils';

const Dashboard = () => {
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
      <div className="w-full">
        <div className="p-3 md:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2 md:gap-4 items-start lg:items-center lg:justify-center">
            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
              <FilterDropdown
                label="Time Frame"
                options={timeFrameOptions}
                value={filter.timeFrame}
                onChange={(value) => handleFilterChange('timeFrame', value)}
              />
              <FilterDropdown
                label="Sort By"
                options={sortOptions}
                value={filter.direction === 'asc' ? 'created-asc' : filter.sort}
                onChange={(value) => handleFilterChange('sort', value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
              <FilterDropdown
                label="Comments"
                options={commentRanges}
                value={filter.commentsRange || ''}
                onChange={(value) => handleFilterChange('commentsRange', value)}
              />
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

            <div className="w-full lg:w-auto lg:flex-grow-0">
              <LabelsFilter
                selectedLabels={filter.labels || []}
                onLabelsChange={(labels) => handleFilterChange('labels', labels)}
              />
            </div>

            <div className="w-full lg:w-auto flex items-center justify-start">
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

        <div className="p-3 md:p-4">
          {showLoadingSpinner ? (
            <div className="min-h-[200px]">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="min-h-[200px]">
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
                              {issue.labels.length > 10 ? (
                                <>
                                  {issue.labels.slice(0, 10).map((label) => (
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
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const dialog = document.createElement('dialog');
                                      dialog.className = 'fixed inset-0 z-50 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md mx-auto mt-20 border border-gray-200 dark:border-gray-700';
                                      
                                      const content = document.createElement('div');
                                      content.className = 'space-y-4';
                                      
                                      const title = document.createElement('h3');
                                      title.className = 'text-lg font-semibold text-gray-900 dark:text-white mb-4';
                                      title.textContent = 'All Labels';
                                      content.appendChild(title);
                                      
                                      const labelsContainer = document.createElement('div');
                                      labelsContainer.className = 'flex flex-wrap gap-2';
                                      
                                      issue.labels.forEach(label => {
                                        const labelSpan = document.createElement('span');
                                        labelSpan.className = 'inline-flex items-center px-2 py-1 text-sm font-medium rounded-full whitespace-nowrap';
                                        labelSpan.textContent = label.name;
                                        Object.assign(labelSpan.style, getLabelColors(label.color));
                                        labelsContainer.appendChild(labelSpan);
                                      });
                                      content.appendChild(labelsContainer);
                                      
                                      const closeButton = document.createElement('button');
                                      closeButton.className = 'mt-6 w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors';
                                      closeButton.textContent = 'Close';
                                      closeButton.onclick = () => dialog.close();
                                      content.appendChild(closeButton);
                                      
                                      dialog.appendChild(content);
                                      document.body.appendChild(dialog);
                                      dialog.showModal();
                                      
                                      dialog.addEventListener('close', () => {
                                        document.body.removeChild(dialog);
                                      });
                                    }}
                                    className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors whitespace-nowrap"
                                  >
                                    +{issue.labels.length - 10} more
                                  </button>
                                </>
                              ) : (
                                issue.labels.map((label) => (
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
                                ))
                              )}
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
                                {filter.sort === 'updated' 
                                  ? `Updated ${formatDistanceToNow(new Date(issue.updatedAt), { addSuffix: true })}`
                                  : `Created ${formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}`}
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

              {!isLoading && !isFilterLoading && !error && allIssues.length === 0 && initialFetchComplete && (
                <div className="text-center p-8">
                  <p className="text-gray-500 dark:text-gray-400">
                    No issues found
                  </p>
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

export default Dashboard; 