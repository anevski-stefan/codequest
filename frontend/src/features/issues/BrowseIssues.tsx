import { useState, useCallback, useEffect, useMemo } from 'react';
import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { getIssues } from '../../services/github';
import type { IssueParams, Language, IssueResponse } from '../../types/github';
import debounce from '../../utils/debounce';
import { SlidersHorizontal, X, Loader2, ChevronDown } from 'lucide-react';
import IssueDetailsModal from '../../components/IssueDetailsModal';
import IssueCard from '../../components/issues/IssueCard';
import LabelsFilter from '../../components/LabelsFilter';
import { timeFrameOptions, sortOptions, commentRanges, languageOptions } from '../dashboard/constants/filterOptions';
import { usePageTitle } from '../../hooks/usePageTitle';
import useIssueComments from '../../hooks/useIssueComments';
import { CardSkeletonList } from '../../components/skeletons';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import FilterChip from '../../components/ui/FilterChip';
import EmptyState from '../../components/ui/EmptyState';
import LoadMoreButton from '../../components/ui/LoadMoreButton';
import PageHeader from '../../components/ui/PageHeader';
import { AnimatePresence, motion } from 'framer-motion';

const BrowseIssues = () => {
  usePageTitle('Browse issues');
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
    isCommentsModalOpen, selectedIssue, allComments, isLoadingComments, hasMoreComments,
    isLoadingMore, onLoadMore, prefetchComments, handleViewComments, handleCloseComments, handleAddComment
  } = useIssueComments();

  const debouncedSetFilter = useMemo(() => debounce((newFilter: Partial<IssueParams>) => {
    setFilter(prev => ({
      ...prev,
      ...Object.fromEntries(Object.entries(newFilter).filter(([, value]) => value != null))
    }));
  }, 500), []);

  const {
    data, isLoading, isError, isPlaceholderData, error,
    fetchNextPage, hasNextPage, isFetchingNextPage, refetch
  } = useInfiniteQuery<IssueResponse, Error>({
    queryKey: ['issues', filter],
    queryFn: ({ pageParam }) => getIssues({ ...filter, page: pageParam as number }),
    initialPageParam: 1,
    placeholderData: keepPreviousData,
    staleTime: 60000,
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

  useEffect(() => () => { debouncedSetFilter.cancel(); }, [debouncedSetFilter]);

  const showLoading = isLoading || !initialFetchComplete;
  const activeFilterCount = [
    filter.timeFrame !== 'all',
    filter.sort !== 'created' || filter.direction === 'asc',
    !!filter.commentsRange,
    !!filter.language,
    (filter.labels?.length ?? 0) > 0,
    filter.unassigned,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Page header ────────────────────────────────────────── */}
      <div className="px-6 lg:px-8 pt-7 pb-0 shrink-0">
        <PageHeader
          eyebrow="Discover"
          title="Browse issues"
          subtitle={allIssues.length > 0
            ? <span className="tabular">{allIssues.length}{hasNextPage ? '+' : ''} beginner-friendly issues across GitHub</span>
            : 'Beginner-friendly issues from top repositories'}
          actions={isPlaceholderData ? (
            <div className="flex items-center gap-1.5 text-xs text-gray-500" role="status">
              <Loader2 className="h-3 w-3 animate-spin" />
              Refreshing
            </div>
          ) : undefined}
        />

        {/* ── Horizontal filter bar (desktop) ─────────────────── */}
        <div className="hidden lg:flex items-center gap-2 pb-4 border-b border-white/[0.05] w-full flex-wrap">
          <FilterChip
            prefix="Time"
            options={timeFrameOptions}
            value={filter.timeFrame}
            onChange={handleTimeFrameChange}
            defaultValue="all"
          />
          <FilterChip
            prefix="Sort"
            options={sortOptions}
            value={filter.direction === 'asc' ? 'created-asc' : filter.sort}
            onChange={handleSortChange}
            defaultValue="created"
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
            className={`flex items-center gap-2 h-8 px-3 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer active:scale-[0.97] ${
              filter.unassigned
                ? 'border-blue-500/40 bg-blue-500/[0.08] text-blue-300 shadow-[inset_0_1px_0_rgba(59,123,255,0.07)]'
                : 'border-white/[0.09] bg-[#363B52] text-gray-400 hover:border-white/[0.18] hover:text-gray-200'
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
            className="flex items-center gap-2 h-10 px-3.5 rounded-lg text-xs font-semibold text-gray-300 border border-white/[0.09] bg-[#363B52] hover:border-white/[0.18] hover:text-white active:scale-[0.97] transition-all cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center tabular">{activeFilterCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* ── Mobile filter drawer ────────────────────────────────── */}
      <AnimatePresence>
      {isMobileFiltersOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-[#0f111a]/70 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsMobileFiltersOpen(false)}
          />
          <motion.aside
            initial={{ y: '100%' }}
            animate={{ y: 0, transition: { type: 'spring', stiffness: 380, damping: 38 } }}
            exit={{ y: '100%', transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }}
            role="dialog" aria-modal="true" aria-label="Filters"
            className="absolute inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl bg-[#2E3245] border-t border-white/[0.08] shadow-[0_-24px_48px_-12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.07)] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
            <div className="flex justify-center pt-2.5"><span className="w-9 h-1 rounded-full bg-white/15" /></div>
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.05]">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Filters</p>
              <button onClick={() => setIsMobileFiltersOpen(false)} aria-label="Close filters" className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-5 space-y-6">
              {[
                { label: 'Time Frame', options: timeFrameOptions, value: filter.timeFrame, onChange: handleTimeFrameChange },
                { label: 'Sort By', options: sortOptions, value: filter.direction === 'asc' ? 'created-asc' : filter.sort, onChange: handleSortChange },
                { label: 'Comments', options: commentRanges, value: filter.commentsRange, onChange: handleCommentsChange },
                { label: 'Language', options: [{ value: '', label: 'All Languages' }, ...languageOptions.slice(1).map(l => ({ value: l, label: l.charAt(0).toUpperCase() + l.slice(1) }))], value: filter.language, onChange: handleLanguageChange },
              ].map(({ label, options, value, onChange }) => (
                <div key={label} className="space-y-2">
                  <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">{label}</p>
                  <div className="relative">
                    <select
                      value={value}
                      onChange={e => onChange(e.target.value)}
                      className="w-full appearance-none bg-white/[0.05] border border-white/[0.08] rounded-xl pl-3 pr-8 h-11 text-sm text-gray-300 focus:outline-none focus:border-blue-500/60 transition-all cursor-pointer [&>option]:bg-[#2E3245]"
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
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Unassigned</p>
                <button
                  onClick={() => handleFilterChange({ unassigned: !filter.unassigned })}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${filter.unassigned ? 'border-blue-500/40 bg-blue-500/[0.08] text-blue-300' : 'border-white/[0.08] bg-white/[0.03] text-gray-400'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full transition-colors ${filter.unassigned ? 'bg-blue-400' : 'bg-gray-600'}`} />
                  Unassigned only
                </button>
              </div>
            </div>
          </motion.aside>
        </div>
      )}
      </AnimatePresence>

      {/* ── Scrollable table area ───────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {showLoading ? (
          <div className="px-4 lg:px-6 xl:px-8 py-4"><CardSkeletonList count={8} /></div>
        ) : (
          <>
            {isError && error instanceof Error && (
              <div className="p-6"><ErrorDisplay title="Failed to load issues" error={error.message} onRetry={() => refetch()} /></div>
            )}

            {!isError && allIssues.length === 0 && initialFetchComplete && (
              <EmptyState
                icon={SlidersHorizontal}
                title="No issues match these filters"
                subtitle="Widen the time frame or clear a label to see more beginner-friendly work."
              />
            )}

            {allIssues.length > 0 && (
              <div className="px-4 lg:px-6 xl:px-8 py-4 grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                {allIssues.map((issue, i) => (
                  <IssueCard
                    key={`${issue.repository?.fullName}-${issue.number}`}
                    issue={issue}
                    index={i}
                    onOpen={handleViewComments}
                    onPrefetch={prefetchComments}
                  />
                ))}
              </div>
            )}

            {!isLoading && hasNextPage && allIssues.length > 0 && (
              <LoadMoreButton onClick={() => fetchNextPage()} isLoading={isFetchingNextPage} />
            )}

            {!isLoading && !hasNextPage && allIssues.length > 0 && (
              <p className="flex items-center justify-center gap-3 text-[11px] text-gray-600 py-6 before:h-px before:w-12 before:bg-white/[0.06] after:h-px after:w-12 after:bg-white/[0.06]">End of results</p>
            )}
          </>
        )}
      </div>

      <IssueDetailsModal
        isOpen={isCommentsModalOpen}
        onClose={handleCloseComments}
        issue={selectedIssue}
        comments={allComments}
        isLoadingComments={isLoadingComments}
        hasMoreComments={hasMoreComments}
        isLoadingMore={isLoadingMore}
        onLoadMore={onLoadMore}
        onAddComment={handleAddComment}
      />
    </div>
  );
};


export default BrowseIssues;
