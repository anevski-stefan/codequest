import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { HackathonCard } from './hackathons/HackathonCard';
import { Pagination } from './ui/Pagination';
import { ErrorDisplay } from './ui/ErrorDisplay';
import { usePageTitle } from '../hooks/usePageTitle';
import { fetchHackathons } from '../services/hackathons';
import type { HackathonResponse } from '../types/hackathon';
import { HackathonSkeleton } from './skeletons/HackathonSkeleton';

const ITEMS_PER_PAGE = 10;

export default function HackathonList() {
  usePageTitle('Hackathons');
  const [page, setPage] = React.useState(1);

  const {
    data,
    isLoading,
    isError,
    error,
    isFetching
  } = useQuery<HackathonResponse, Error>({
    queryKey: ['hackathons', page],
    queryFn: () => fetchHackathons(page, ITEMS_PER_PAGE),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount: number, error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        return failureCount < 3;
      }
      return false;
    }
  });

  if (isLoading && !data) {
    return (
      <div className="max-w-7xl mx-auto py-8 mt-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Upcoming Hackathons
        </h2>
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <HackathonSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorDisplay 
        error={error instanceof Error ? error.message : 'An error occurred'} 
        title="Upcoming Hackathons" 
      />
    );
  }

  if (!data || !data.hackathons) {
    return <div>No hackathons available</div>;
  }

  return (
    <div className="max-w-7xl mx-auto py-8 mt-12">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        Upcoming Hackathons
      </h2>
      
      <div className="grid gap-6">
        {data.hackathons.map((hackathon) => (
          <HackathonCard key={hackathon.url} hackathon={hackathon} />
        ))}
      </div>

      {isFetching && (
        <div className="grid gap-6 mt-6">
          <HackathonSkeleton />
        </div>
      )}

      {data && data.totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={data.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
} 