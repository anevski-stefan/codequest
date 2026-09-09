import { useState, useCallback, useEffect, useMemo } from 'react';
import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { getIssues } from '../../services/github';
import type { IssueParams, Language, IssueResponse } from '../../types/github';
import debounce from '../../utils/debounce';
import { SlidersHorizontal, X, Loader2, ChevronDown } from 'lucide-react';
import CommentsModal from '../../components/CommentsModal';
import LabelsFilter from '../../components/LabelsFilter';
import { timeFrameOptions, sortOptions, commentRanges, languageOptions } from './constants/filterOptions';
import { usePageTitle } from '../../hooks/usePageTitle';
import useIssueComments from '../../hooks/useIssueComments';
import IssueTable from './components/IssueTable';
import { CardSkeletonList } from '../../components/skeletons';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';

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
  const [initialFetchComplete, setInitialFetchComplete] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const {
    isCommentsModalOpen, allComments, isLoadingComments, hasMoreComments,
    isLoadingMore, onLoadMore, handleViewComments, handleCloseComments, handleAddComment
  } = useIssueComments();

  const debouncedSetFilter = useMemo(() => debounce((newFilter: Partial<IssueParams>) => {
    setFilter(prev => ({
      ...prev,
      ...Object.fromEntries(Object.entries(newFilter).filter(([, value]) => value != null))
    }));
  }, 500), []);

  const {
    data, isLoading, isError, isPlaceholderData, error,
    fetchNextPage, hasNextPage, isFetchingNextPage
  } = useInfiniteQuery<IssueResponse, Error>({
    queryKey: ['issues', filter],
    queryFn: ({ pageParam }) => getIssues({ ...filter, page: pageParam as number }),
    initialPageParam: 1,
    placeholderData: keepPreviousData,
    staleTime: 0,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage, allPages) => lastPage.hasMore ? allPages.length + 1 : undefined
  });

  const allIssues = useMemo(() => data?.pages.flatMap(p => p.issues) ?? [], [data]);

  useEffect(() => {
    if (isPlaceholderData) return;
    if (isError) { setInitialFetchComplete(true); return; }
    if (data) setInitialFetchComplete(true);
  }, [isPlaceholderData, isError, data]);

  const handleFilterChange = useCallback((f: Partial<IssueParams>) => debouncedSetFilter(f), [debouncedSetFilter]);
  const handleTimeFrameChange   = useCallback((v: string) => handleFilterChange({ timeFrame: v }), [handleFilterChange]);
  const handleSortChange        = useCallback((v: string) => handleFilterChange({ sort: v, direction: v === 'created-asc' ? 'asc' : 'desc' }), [handleFilterChange]);
  const handleCommentsChange    = useCallback((v: string) => handleFilterChange({ commentsRange: v }), [handleFilterChange]);
  const handleLanguageChange    = useCallback((v: string) => handleFilterChange({ language: v as Language }), [handleFilterChange]);
  const handleLabelsChange      = useCallback((labels: string[]) => handleFilterChange({ labels }), [handleFilterChange]);
  const handleUnassignedChange  = useCallback((e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange({ unassigned: e.target.checked }), [handleFilterChange]);

  useEffect(() => () => { debouncedSetFilter.cancel(); }, [debouncedSetFilter]);

  const showLoading = isLoading || !initialFetchComplete;

  return (
    <div className="flex flex-col h-screen overflow-hidden">

      {/* ── Page header ────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-white">Open Issues</h1>
            <p className="text-xs text-gray-600 mt-0.5">
              {allIssues.length > 0
                ? `${allIssues.length}${hasNextPage ? '+' : ''} issues`
                : 'Beginner-friendly issues from top repos'}
            </p>
          </div>
          {isPlaceholderData && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Loader2 className="h-3 w-3 animate-spin" />
              Refreshing
            </div>
          )}
        </div>

        {/* ── Horizontal filter bar (desktop) ─────────────────── */}
        <div className="hidden lg:flex items-center gap-2 pb-4 border-b border-white/[0.05] w-full">
          <FilterChip
            prefix="Time"
            options={timeFrameOptions}
            value={filter.timeFrame}
            onChange={handleTimeFrameChange}
          />
          <FilterChip
            prefix="Sort"
            options={sortOptions}
            value={filter.direction === 'asc' ? 'created-asc' : filter.sort}
            onChange={handleSortChange}
          />
          <FilterChip
            prefix="Comments"
            options={commentRanges}
            value={filter.commentsRange}
            onChange={handleCommentsChange}
          />
          <FilterChip
            prefix="Language"
            options={[{ value: '', label: 'All Languages' }, ...languageOptions.slice(1).map(l => ({ value: l, label: l.charAt(0).toUpperCase() + l.slice(1) }))]}
            value={filter.language}
            onChange={handleLanguageChange}
          />

          {/* Labels — takes remaining space */}
          <div className="flex-1 min-w-0">
            <LabelsFilter selectedLabels={filter.labels || []} onLabelsChange={handleLabelsChange} />
          </div>

          <div className="h-5 w-px bg-white/[0.08]" />

          {/* Unassigned toggle */}
          <button
            onClick={() => handleFilterChange({ unassigned: !filter.unassigned })}
            className={`flex items-center gap-2 h-8 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
              filter.unassigned
                ? 'border-blue-500/50 bg-blue-500/10 text-blue-300'
                : 'border-white/[0.10] bg-[#111927] text-gray-400 hover:border-white/[0.18] hover:text-gray-200'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full transition-colors ${filter.unassigned ? 'bg-blue-400' : 'bg-gray-600'}`} />
            Unassigned
          </button>
        </div>

        {/* Mobile filter button */}
        <div className="lg:hidden flex items-center justify-between pb-4 border-b border-white/[0.05]">
          <button
            onClick={() => setIsMobileFiltersOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 border border-white/[0.08] hover:border-white/[0.15] hover:text-white transition-all cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
          </button>
        </div>
      </div>

      {/* ── Mobile filter drawer ────────────────────────────────── */}
      {isMobileFiltersOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileFiltersOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-[#0B1222] border-r border-white/[0.05] overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.05]">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Filters</p>
              <button onClick={() => setIsMobileFiltersOpen(false)} className="p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-white/5 transition-all cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-5 space-y-6">
              {[
                { label: 'Time Frame', options: timeFrameOptions, value: filter.timeFrame, onChange: handleTimeFrameChange },
                { label: 'Sort By', options: sortOptions, value: filter.direction === 'asc' ? 'created-asc' : filter.sort, onChange: handleSortChange },
                { label: 'Comments', options: commentRanges, value: filter.commentsRange, onChange: handleCommentsChange },
              ].map(({ label, options, value, onChange }) => (
                <div key={label} className="space-y-2">
                  <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">{label}</p>
                  <div className="relative">
                    <select
                      value={value}
                      onChange={e => onChange(e.target.value)}
                      className="w-full appearance-none bg-white/[0.05] border border-white/[0.08] rounded-xl pl-3 pr-8 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500/60 transition-all cursor-pointer [&>option]:bg-[#0A1020]"
                    >
                      {options.map((o: string | { value: string; label: string }) => (
                        <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
                          {typeof o === 'string' ? (o || 'All') : o.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                  </div>
                </div>
              ))}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Labels</p>
                <LabelsFilter selectedLabels={filter.labels || []} onLabelsChange={handleLabelsChange} />
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ── Scrollable table area ───────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {showLoading ? (
          <div className="p-6"><CardSkeletonList count={3} /></div>
        ) : (
          <>
            {isError && error instanceof Error && (
              <div className="p-6"><ErrorDisplay title="Failed to load issues" error={error.message} /></div>
            )}

            {!isError && allIssues.length === 0 && initialFetchComplete && (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                  <SlidersHorizontal className="w-4 h-4 text-gray-600" />
                </div>
                <p className="text-sm text-gray-400">No issues found</p>
                <p className="text-xs text-gray-600 mt-1">Try adjusting your filters</p>
              </div>
            )}

            {allIssues.length > 0 && (
              <IssueTable issues={allIssues} onViewComments={handleViewComments} />
            )}

            {!isLoading && hasNextPage && allIssues.length > 0 && (
              <div className="flex justify-center py-5 border-t border-white/[0.04]">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm text-gray-400 border border-white/[0.08] hover:border-white/[0.15] hover:text-white disabled:opacity-40 transition-all cursor-pointer"
                >
                  {isFetchingNextPage ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading…</> : 'Load more'}
                </button>
              </div>
            )}

            {!isLoading && !hasNextPage && allIssues.length > 0 && (
              <p className="text-center text-xs text-gray-700 py-5 border-t border-white/[0.04]">All issues loaded</p>
            )}
          </>
        )}
      </div>

      <CommentsModal
        isOpen={isCommentsModalOpen}
        onClose={handleCloseComments}
        comments={allComments}
        isLoading={isLoadingComments}
        onAddComment={handleAddComment}
        onLoadMore={onLoadMore}
        hasMoreComments={hasMoreComments}
        isLoadingMore={isLoadingMore}
      />
    </div>
  );
};

/* Premium filter chip — styled div + transparent select on top */
const FilterChip = ({
  prefix, options, value, onChange
}: {
  prefix: string;
  options: (string | { value: string; label: string })[];
  value: string;
  onChange: (v: string) => void;
}) => {
  const selected = options.find(o => (typeof o === 'string' ? o : o.value) === value);
  const selectedLabel = selected
    ? (typeof selected === 'string' ? (selected || 'All') : selected.label)
    : 'All';
  const isActive = value !== '' && value !== 'all' && value !== 'created' && value !== '';

  return (
    <div className="relative flex-1 min-w-[100px] h-8">
      {/* Visual layer — fills full width of flex-1 container */}
      <div className={`absolute inset-0 flex items-center gap-1.5 px-3 rounded-lg border text-xs transition-all pointer-events-none ${
        isActive
          ? 'border-blue-500/40 bg-blue-500/[0.08]'
          : 'border-white/[0.10] bg-[#111927]'
      }`}>
        <span className="text-gray-500 whitespace-nowrap">{prefix}:</span>
        <span className={`font-medium truncate ${isActive ? 'text-blue-300' : 'text-gray-200'}`}>
          {selectedLabel}
        </span>
        <ChevronDown className={`w-3 h-3 ml-auto shrink-0 ${isActive ? 'text-blue-400' : 'text-gray-600'}`} />
      </div>
      {/* Actual select — absolute, fills the container exactly */}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer w-full"
        aria-label={prefix}
      >
        {options.map(o => (
          <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
            {typeof o === 'string' ? (o || 'All') : o.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Dashboard;
