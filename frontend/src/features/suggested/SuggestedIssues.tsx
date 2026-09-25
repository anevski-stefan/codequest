import { useState, useMemo } from 'react';
import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { Star, GitPullRequest } from 'lucide-react';
import { getSuggestedIssues } from '../../services/github';
import type { Issue } from '../../types/github';
import { CardSkeletonList } from '../../components/skeletons';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { usePageTitle } from '../../hooks/usePageTitle';
import useIssueComments from '../../hooks/useIssueComments';
import IssueDetailsModal from '../../components/IssueDetailsModal';
import IssueCard from '../../components/issues/IssueCard';
import FilterChip from '../../components/ui/FilterChip';
import EmptyState from '../../components/ui/EmptyState';
import LoadMoreButton from '../../components/ui/LoadMoreButton';

const LANGUAGES = [
  { value: '', label: 'Any Language' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'php', label: 'PHP' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
];

const TIME_FRAMES = [
  { value: 'week', label: 'Last Week' },
  { value: 'month', label: 'Last Month' },
  { value: 'year', label: 'Last Year' },
  { value: 'all', label: 'All Time' },
];

const COMPETITION = [
  { value: '', label: 'Any' },
  { value: '0', label: 'No Competition' },
  { value: '1-5', label: 'Low (1–5)' },
];

/* ── Page ── */
const SuggestedIssues = () => {
  usePageTitle('For you');

  const [language, setLanguage] = useState('');
  const [timeFrame, setTimeFrame] = useState('month');
  const [commentsRange, setCommentsRange] = useState('');
  const [famousOnly, setFamousOnly] = useState(false);

  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  const {
    isCommentsModalOpen, allComments, isLoadingComments, hasMoreComments,
    isLoadingMore, onLoadMore, handleViewComments, handleCloseComments, handleAddComment,
  } = useIssueComments();

  const handleOpenIssue = (issue: Issue) => {
    setSelectedIssue(issue);
    handleViewComments(issue);
  };

  const handleClose = () => {
    setSelectedIssue(null);
    handleCloseComments();
  };

  const filterKey = { language, timeFrame, commentsRange, famousOnly };

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['suggested-issues-v2', filterKey],
      queryFn: ({ pageParam = 1 }) =>
        getSuggestedIssues({ language, timeFrame, commentsRange, famousOnly, page: pageParam as number }),
      initialPageParam: 1,
      getNextPageParam: (lastPage, allPages) =>
        lastPage.hasMore ? allPages.length + 1 : undefined,
      placeholderData: keepPreviousData,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
    });

  const allIssues = useMemo(() => data?.pages.flatMap(p => p.issues) ?? [], [data]);
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  const isRateLimitError =
    error instanceof Error &&
    (error.message.includes('rate limit') || error.message.includes('secondary rate limit'));

  const [owner, repo] = (selectedIssue?.repository?.fullName ?? '').split('/');

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="px-6 lg:px-8 pt-7 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-400/80 mb-1.5">Workspace</p>
            <h1 className="text-xl font-bold tracking-tight text-white">For you</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {allIssues.length > 0
                ? `${totalCount.toLocaleString()} issues found · showing ${allIssues.length}`
                : 'Curated beginner-friendly issues, matched to your skills'}
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-white/[0.05]">
          <FilterChip
            prefix="Language"
            options={LANGUAGES}
            value={language}
            onChange={setLanguage}
            maxW="max-w-[200px]"
            defaultValue=""
          />
          <FilterChip
            prefix="Time"
            options={TIME_FRAMES}
            value={timeFrame}
            onChange={setTimeFrame}
            maxW="max-w-[160px]"
            defaultValue="month"
          />
          <FilterChip
            prefix="Competition"
            options={COMPETITION}
            value={commentsRange}
            onChange={v => setCommentsRange(v)}
            maxW="max-w-[210px]"
            defaultValue=""
          />

          {/* Spacer absorbs remaining width */}
          <div className="flex-1" />

          <div className="h-5 w-px bg-white/[0.08]" />

          {/* Famous repos toggle */}
          <button
            onClick={() => setFamousOnly(prev => !prev)}
            className={`flex items-center gap-2 h-8 px-3 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer active:scale-[0.97] ${
              famousOnly
                ? 'border-amber-500/40 bg-amber-500/[0.08] text-amber-300 shadow-[inset_0_1px_0_rgba(245,158,11,0.07)]'
                : 'border-white/[0.09] bg-[#363B52] text-gray-400 hover:border-white/[0.18] hover:text-gray-200'
            }`}
          >
            <Star className={`w-3 h-3 ${famousOnly ? 'fill-amber-400 text-amber-400' : 'text-gray-600'}`} />
            Famous only
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="px-4 lg:px-6 xl:px-8 py-4"><CardSkeletonList count={8} /></div>
        ) : error instanceof Error ? (
          <div className="p-6">
            <ErrorDisplay
              title={isRateLimitError ? 'GitHub API rate limit exceeded' : 'Failed to load issues'}
              error={isRateLimitError ? 'Please wait a few minutes before trying again.' : error.message}
            />
          </div>
        ) : allIssues.length === 0 ? (
          <EmptyState icon={GitPullRequest} title="No issues found for these filters" subtitle="Try widening the time frame or removing the language filter" />
        ) : (
          <>
            <div className="px-4 lg:px-6 xl:px-8 py-4 grid grid-cols-1 lg:grid-cols-2 gap-2.5">
              {allIssues.map((issue, i) => (
                <IssueCard key={`${issue.repository?.fullName}-${issue.number}`} issue={issue} index={i} onOpen={handleOpenIssue} />
              ))}
            </div>

            {hasNextPage && (
              <LoadMoreButton onClick={() => fetchNextPage()} isLoading={isFetchingNextPage} />
            )}

            {!hasNextPage && allIssues.length > 0 && (
              <p className="flex items-center justify-center gap-3 text-[11px] text-gray-600 py-6 before:h-px before:w-12 before:bg-white/[0.06] after:h-px after:w-12 after:bg-white/[0.06]">End of results</p>
            )}
          </>
        )}
      </div>

      <IssueDetailsModal
        isOpen={isCommentsModalOpen}
        onClose={handleClose}
        issue={selectedIssue}
        comments={allComments}
        isLoadingComments={isLoadingComments}
        hasMoreComments={hasMoreComments}
        isLoadingMore={isLoadingMore}
        onLoadMore={onLoadMore}
        onAddComment={handleAddComment}
        owner={owner}
        repo={repo}
      />
    </div>
  );
};

export default SuggestedIssues;
