import { useState, useCallback } from 'react';
import { useQuery } from 'react-query';
import { getIssues } from '../../services/github';
import { formatDistanceToNow } from 'date-fns';
import { Search, ChevronDown, MessageCircle, GitPullRequest } from 'lucide-react';
import type { Issue, IssueParams, Language } from '../../types/github';
import debounce from 'lodash/debounce';

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

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<IssueParams>({
    language: '',
    sort: 'created',
    state: 'open',
    page: 1
  });
  const [allIssues, setAllIssues] = useState<Issue[]>([]);

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
  const handleFilterChange = (key: keyof IssueParams, value: string) => {
    debouncedSetFilter({ 
      ...filter, 
      [key]: value,
      page: 1 // Reset page when filter changes
    });
  };

  const handleLoadMore = () => {
    setFilter(prev => ({ ...prev, page: prev.page + 1 }));
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
            options={['created', 'updated', 'comments']}
            value={filter.sort}
            onChange={(value) => handleFilterChange('sort', value as 'created' | 'updated' | 'comments')}
          />
          <FilterDropdown
            label="State"
            options={['open', 'closed']}
            value={filter.state}
            onChange={(value) => handleFilterChange('state', value as 'open' | 'closed')}
          />
        </div>
      </div>

      {error instanceof Error && (
        <div className="text-center text-red-600 p-4 mb-4 bg-red-50 rounded-lg">
          {error.message || 'Failed to load issues'}
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {allIssues.map((issue: Issue) => (
            <li key={issue.id}>
              <a href={issue.url} target="_blank" rel="noopener noreferrer" className="block hover:bg-gray-50">
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
                        {' '}{formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              </a>
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
    </>
  );
};

interface FilterDropdownProps {
  label: string;
  options: string[];
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
          <option key={option} value={option}>
            {option ? option.charAt(0).toUpperCase() + option.slice(1) : 'All Languages'}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
    </div>
  );
}

export default Dashboard; 