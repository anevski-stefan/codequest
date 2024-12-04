import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from 'react-query';
import { getIssues, getIssueComments, addIssueComment } from '../../services/github';
import { formatDistanceToNow } from 'date-fns';
import { Search, ChevronDown, MessageSquare } from 'lucide-react';
import type { Issue, IssueParams, Language } from '../../types/github';
import debounce from 'lodash/debounce';
import CommentsModal from '../../components/CommentsModal';
import LabelsFilter from '../../components/LabelsFilter';

const getStateColor = (state: string) => {
  switch (state.toLowerCase()) {
    case 'open':
      return 'bg-green-100 text-green-800';
    case 'closed':
      return 'bg-red-100 text-red-800';
    case 'completed':
      return 'bg-blue-100 text-blue-800';
    case 'not planned':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const timeFrameOptions = [
  { value: 'all', label: 'All Time' },
  { value: 'day', label: 'Last 24 Hours' },
  { value: 'week', label: 'Last Week' },
  { value: 'month', label: 'Last Month' },
  { value: 'year', label: 'Last Year' }
];

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'updated', label: 'Recently Updated' },
  { value: 'comments', label: 'Most Comments' }
];

const commentRanges = [
  { value: '', label: 'Any Comments' },
  { value: '0', label: 'No Comments' },
  { value: '1-5', label: '1-5 Comments' },
  { value: '6-10', label: '6-10 Comments' },
  { value: '10+', label: '10+ Comments' }
];

const getLabelColors = (color: string) => {
  // Convert hex to RGB to check brightness
  const r = parseInt(color.slice(0, 2), 16);
  const g = parseInt(color.slice(2, 4), 16);
  const b = parseInt(color.slice(4, 6), 16);
  
  // Calculate perceived brightness using YIQ formula
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  
  return {
    backgroundColor: `#${color}`,
    color: yiq >= 128 ? '#000000' : '#ffffff'  // Use black text for light backgrounds, white for dark
  };
};

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<IssueParams>({
    language: '',
    sort: 'created',
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
      setFilter(newFilter);
      // Reset accumulated issues when filters change
      if (newFilter.page === 1) {
        setAllIssues([]);
      }
    }, 500),
    []
  );

  const { data, isLoading, error } = useQuery<any, Error>(
    ['issues', filter],
    () => getIssues(filter),
    {
      keepPreviousData: true,
      staleTime: 60000,
      cacheTime: 300000,
      refetchOnWindowFocus: false,
      onSuccess: (newData) => {
        if (filter.page === 1) {
          setAllIssues(newData.issues);
        } else {
          setAllIssues(prev => [...prev, ...newData.issues]);
        }
      }
    }
  );

  // Handle filter changes with debounce
  const handleFilterChange = (key: keyof IssueParams, value: string | boolean | string[]) => {
    const newFilter = { 
      ...filter,
      [key]: value,
      page: 1 // Reset page when filter changes
    };

    // If labels are being added and no timeFrame is set, default to recent items
    if (key === 'labels' && Array.isArray(value) && value.length > 0 && filter.timeFrame === 'all') {
      newFilter.timeFrame = 'month'; // Default to last month for labeled issues
    }

    // If unassigned is being unchecked, remove it from the filter
    if (key === 'unassigned' && value === false) {
      delete newFilter.unassigned;
    }

    debouncedSetFilter(newFilter);
    setAllIssues([]);
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

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0 sm:space-x-4 w-full">
        <div className="w-full sm:w-auto relative">
          <input
            type="text"
            placeholder="Search issues..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
        </div>
        
        <div className="flex space-x-4">
          <LabelsFilter
            selectedLabels={filter.labels || []}
            onLabelsChange={(labels) => handleFilterChange('labels', labels)}
          />
          <FilterDropdown
            label="Language"
            options={['', 'javascript', 'typescript', 'python', 'java', 'go', 'rust']}
            value={filter.language}
            onChange={(value) => handleFilterChange('language', value as Language)}
          />
          <FilterDropdown
            label="Sort"
            options={sortOptions}
            value={filter.sort}
            onChange={(value) => handleFilterChange('sort', value as IssueParams['sort'])}
          />
          <FilterDropdown
            label="State"
            options={['open', 'closed']}
            value={filter.state}
            onChange={(value) => handleFilterChange('state', value as 'open' | 'closed')}
          />
          <FilterDropdown
            label="Time"
            options={timeFrameOptions.map(opt => ({ value: opt.value, label: opt.label }))}
            value={filter.timeFrame || 'all'}
            onChange={(value) => handleFilterChange('timeFrame', value)}
          />
          <FilterDropdown
            label="Comments"
            options={commentRanges}
            value={filter.commentsRange || ''}
            onChange={(value) => handleFilterChange('commentsRange', value)}
          />
          <div className="flex items-center">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={filter.unassigned}
                onChange={(e) => handleFilterChange('unassigned', e.target.checked)}
                className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
              />
              <span className="ml-2 text-sm text-gray-600">Unassigned only</span>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 w-full">
        {error instanceof Error && (
          <div className="text-center text-red-600 p-4 mb-4 bg-red-50 rounded-lg w-full">
            {error.message || 'Failed to load issues'}
          </div>
        )}

        {allIssues?.length > 0 ? (
          <div className="bg-white rounded-lg border shadow-sm divide-y divide-gray-100 w-full">
            {allIssues.map((issue) => (
              <div key={`${issue.id}-${issue.number}`} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col gap-3">
                  {/* Title and Repository */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <a 
                        href={issue.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-base font-medium text-gray-900 hover:text-blue-600"
                      >
                        {issue.title}
                      </a>
                      <p className="mt-0.5 text-sm text-gray-500">
                        {issue.repository?.fullName} #{issue.number}
                      </p>
                    </div>
                    
                    {/* Special Status Labels */}
                    <div className="flex flex-wrap gap-1.5 ml-4">
                      {issue.labels.map((label) => (
                        <span
                          key={label.name}
                          className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full whitespace-nowrap"
                          style={getLabelColors(label.color)}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Metadata and Actions */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4 text-gray-500">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${getStateColor(issue.state)}`}>
                        <span className={`w-2 h-2 rounded-full mr-2 ${
                          issue.state === 'open' ? 'bg-green-500' : 'bg-purple-500'
                        }`} />
                        {issue.state}
                      </span>
                      <span>•</span>
                      <span>
                        Updated {formatDistanceToNow(new Date(issue.updatedAt), { addSuffix: true })}
                      </span>
                      <span>•</span>
                      <span>
                        {issue.commentsCount} comments
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleViewComments(issue)}
                        className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <MessageSquare size={14} className="mr-1.5" />
                        View Comments
                      </button>
                      <a 
                        href={issue.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        View on GitHub
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border rounded-lg p-8 text-center w-full">
            <p className="text-gray-500">
              No issues found
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        )}

        {!isLoading && data?.hasMore && (
          <div className="flex justify-center mt-6">
            <button
              onClick={handleLoadMore}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Load More
            </button>
          </div>
        )}

        {!isLoading && !data?.hasMore && allIssues.length > 0 && (
          <div className="text-center text-gray-600 py-8">
            No more issues to load
          </div>
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

interface FilterDropdownProps {
  label: string;
  options: string[] | { value: string; label: string; }[];
  value: string;
  onChange: (value: string) => void;
}

function FilterDropdown({ label, options, value, onChange }: FilterDropdownProps) {
  return (
    <div className="relative">
      <select
        className="appearance-none bg-white border rounded-lg pl-3 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          {label}
        </option>
        {options.map((option) => (
          <option 
            key={typeof option === 'string' ? option : option.value} 
            value={typeof option === 'string' ? option : option.value}
          >
            {typeof option === 'string' 
              ? (option ? option.charAt(0).toUpperCase() + option.slice(1) : 'All Languages')
              : option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
    </div>
  );
}

export default Dashboard; 