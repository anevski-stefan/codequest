import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { HackathonCard } from './hackathons/HackathonCard';
import { Pagination } from './ui/Pagination';
import { ErrorDisplay } from './ui/ErrorDisplay';
import { SearchBar } from './ui/SearchBar';
import { usePageTitle } from '../hooks/usePageTitle';
import { fetchHackathons } from '../services/hackathons';
import { HackathonSkeleton } from './skeletons/HackathonSkeleton';
import { HackathonResponse } from '../types/hackathon';
import { useDebounce } from '../hooks/useDebounce';

const ITEMS_PER_PAGE = 10;

export default function HackathonList() {
  usePageTitle('Hackathons');
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState('all');
  const debouncedSearch = useDebounce(search, 300);

  const {
    data,
    isLoading,
    isError,
    error,
    isFetching
  } = useQuery<HackathonResponse>({
    queryKey: ['hackathons', page, debouncedSearch, filter],
    queryFn: async () => {
      const response = await fetchHackathons(page, ITEMS_PER_PAGE, debouncedSearch, filter);
      return response;
    },
    staleTime: 1000 * 60 * 5,
    placeholderData: (previousData) => previousData,
    refetchInterval: 1000 * 60 * 5,
  });

  // Reset page when search or filter changes
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filter]);

  const renderContent = () => {
    if (isError) {
      return (
        <ErrorDisplay 
          error={error instanceof Error ? error.message : 'An error occurred'} 
          title="Upcoming Hackathons" 
        />
      );
    }

    if (!data?.hackathons?.length) {
      return (
        <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
          No hackathons available at the moment
        </div>
      );
    }

    return (
      <div className="grid gap-6">
        {data.hackathons.map((hackathon) => (
          <HackathonCard key={hackathon.url} hackathon={hackathon} />
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Hackathons
            </h2>
            <div className="flex items-center gap-2">
              {data?.totalHackathons !== undefined && data.totalHackathons > 0 && (
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Showing {data.hackathons.length} of {data.totalHackathons} hackathons
                </p>
              )}
              {isFetching && !isLoading && (
                <span className="mt-2 text-sm text-gray-500 dark:text-gray-400 animate-pulse">
                  Updating...
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Hackathons</option>
              <option value="active">Active</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
            </select>
            <SearchBar 
              value={search}
              onChange={setSearch}
              placeholder="Search by title or description..."
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6">
            {[1, 2, 3].map((i) => (
              <HackathonSkeleton key={i} />
            ))}
          </div>
        ) : (
          renderContent()
        )}

        {data && data.totalPages > 1 && (
          <div className="mt-12">
            <Pagination
              currentPage={page}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
} 