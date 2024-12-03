import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from 'react-query';
import { getIssues, getIssueComments, addIssueComment } from '../../services/github';
import { formatDistanceToNow } from 'date-fns';
import { Search, ChevronDown, MessageCircle, GitPullRequest, MessageSquare } from 'lucide-react';
import type { Issue, IssueParams, Language } from '../../types/github';
import debounce from 'lodash/debounce';
import CommentsModal from '../../components/CommentsModal';

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

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<IssueParams>({
    language: '',
    sort: 'created',
    state: 'open',
    page: 1,
    timeFrame: 'all',
    unassigned: false,
    commentsRange: ''
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
  const handleFilterChange = (key: keyof IssueParams, value: string | boolean) => {
    const newFilter = { 
      ...filter,
      [key]: value,
      page: 1 // Reset page when filter changes
    };

    // If unassigned is being unchecked, remove it from the filter
    if (key === 'unassigned' && value === false) {
      delete newFilter.unassigned;
    }

    debouncedSetFilter(newFilter);
    
    // Reset accumulated issues when filters change
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
    <>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0 sm:space-x-4">
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

      {error instanceof Error && (
        <div className="text-center text-red-600 p-4 mb-4 bg-red-50 rounded-lg">
          {error.message || 'Failed to load issues'}
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {allIssues?.map((issue) => (
            <li key={`${issue.id}-${issue.number}`}>
              <div className="block hover:bg-gray-50">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-blue-600 truncate">{issue.title}</p>
                    <div className="ml-2 flex-shrink-0 flex gap-2">
                      {issue.labels.map((label) => (
                        <span
                          key={label.name}
                          className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                          style={{ 
                            backgroundColor: `#${label.color}`,
                            color: parseInt(label.color, 16) > 0xffffff / 2 ? '#000' : '#fff'
                          }}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm">
                        <GitPullRequest className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStateColor(issue.state)}`}>
                          {issue.state}
                        </span>
                      </p>
                      <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                        <MessageCircle className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                        {issue.commentsCount} comments
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <p>
                        Opened by <span className="font-medium text-gray-900">{issue.user.login}</span>
                        {' '}
                        {issue.createdAt ? (
                          formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })
                        ) : (
                          'unknown time ago'
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <button
                        onClick={() => handleViewComments(issue)}
                        className="flex items-center hover:text-blue-600"
                      >
                        <MessageSquare className="flex-shrink-0 mr-1.5 h-5 w-5" />
                        View Comments
                      </button>
                      <a
                        href={issue.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-sm text-gray-600 hover:text-blue-600 ml-4"
                      >
                        View on GitHub
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

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
    </>
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