import React from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { HackathonCard } from '../../components/hackathons/HackathonCard';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchHackathons } from '../../services/hackathons';
import { HackathonSkeleton } from '../../components/skeletons/HackathonSkeleton';
import { HackathonResponse } from '../../types/hackathon';
import { useDebounce } from '../../hooks/useDebounce';
import { ChevronDown, ChevronLeft, ChevronRight, Search, Trophy } from 'lucide-react';
import EmptyState from '../../components/ui/EmptyState';

const ITEMS_PER_PAGE = 10;

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
];

export default function HackathonList() {
  usePageTitle('Hackathons');
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState('all');
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, isError, error, isFetching } = useQuery<HackathonResponse>({
    queryKey: ['hackathons', page, debouncedSearch, filter],
    queryFn: () => fetchHackathons(page, ITEMS_PER_PAGE, debouncedSearch, filter),
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
    refetchInterval: 1000 * 60 * 5,
  });

  React.useEffect(() => { setPage(1); }, [debouncedSearch, filter]);

  const isActive = filter !== 'all';

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="px-6 pt-6 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-white">Hackathons</h1>
            <p className="text-xs text-gray-600 mt-0.5">
              {data?.totalHackathons
                ? `${data.totalHackathons} hackathons · page ${data.currentPage} of ${data.totalPages}`
                : 'Live competitions and coding challenges'}
              {isFetching && !isLoading && <span className="ml-2 text-gray-700">Updating…</span>}
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 pb-4 border-b border-white/[0.05]">
          {/* Status filter chip */}
          <div className="relative h-8 min-w-[110px]">
            <div className={`absolute inset-0 flex items-center gap-1.5 px-3 rounded-lg border text-xs font-medium pointer-events-none transition-all ${
              isActive
                ? 'border-blue-500/40 bg-blue-500/[0.08]'
                : 'border-white/[0.10] bg-[#111927]'
            }`}>
              <span className="text-gray-500 whitespace-nowrap">Status:</span>
              <span className={`font-medium truncate ${isActive ? 'text-blue-300' : 'text-gray-200'}`}>
                {STATUS_OPTIONS.find(o => o.value === filter)?.label ?? 'All'}
              </span>
              <ChevronDown className={`w-3 h-3 ml-auto shrink-0 ${isActive ? 'text-blue-400' : 'text-gray-600'}`} />
            </div>
            <select
              aria-label="Filter hackathons"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative h-8 flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none" />
            <input
              type="text"
              placeholder="Search hackathons…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-full pl-8 pr-3 text-xs bg-[#111927] border border-white/[0.10] rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-[#0D1525] transition-all"
            />
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="px-6 pt-5 space-y-3">
            {[1, 2, 3].map(i => <HackathonSkeleton key={i} />)}
          </div>
        ) : isError ? (
          <div className="p-6">
            <ErrorDisplay title="Failed to load hackathons" error={error instanceof Error ? error.message : 'An error occurred'} />
          </div>
        ) : !data?.hackathons?.length ? (
          <EmptyState icon={Trophy} title="No hackathons found" subtitle="Try adjusting the filter or search term" />
        ) : (
          <>
            <div className="divide-y divide-white/[0.05]">
              {data.hackathons.map(hackathon => (
                <HackathonCard key={hackathon.url} hackathon={hackathon} />
              ))}
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 py-5 border-t border-white/[0.04]">
                <button
                  onClick={() => page > 1 && setPage(page - 1)}
                  disabled={page === 1}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 border border-white/[0.08] rounded-lg hover:border-white/[0.15] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </button>
                <span className="text-xs text-gray-600">
                  Page {data.currentPage} of {data.totalPages}
                </span>
                <button
                  onClick={() => page < data.totalPages && setPage(page + 1)}
                  disabled={page >= data.totalPages}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 border border-white/[0.08] rounded-lg hover:border-white/[0.15] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
