import { useState, useMemo } from 'react';
import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { Star, MessageSquare, ExternalLink, Sparkles, GitPullRequest } from 'lucide-react';
import { getSuggestedIssues } from '../../services/github';
import type { Issue } from '../../types/github';
import { CardSkeletonList } from '../../components/skeletons';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { usePageTitle } from '../../hooks/usePageTitle';
import useIssueComments from '../../hooks/useIssueComments';
import IssueDetailsModal from '../../components/IssueDetailsModal';
import { RepoCellContent, LabelsCellContent } from '../../components/ui/IssueTableCells';
import { formatRelativeDate } from '../../utils/formatDate';
import { formatCount } from '../../utils/formatCount';
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

/* ── Issue row ── */
function IssueRow({ issue, onOpen }: { issue: Issue; onOpen: (issue: Issue) => void }) {
  const stars = issue.repoStars;
  const starTier =
    stars && stars >= 50000 ? 'text-yellow-400 bg-yellow-400/[0.08] border-yellow-400/20' :
    stars && stars >= 10000 ? 'text-amber-400 bg-amber-400/[0.08] border-amber-400/20' :
    'text-gray-500 bg-white/[0.04] border-white/[0.06]';

  return (
    <tr className="group hover:bg-white/[0.025] transition-colors duration-100">
      {/* Title */}
      <td className="px-6 py-3.5">
        <button onClick={() => onOpen(issue)} className="text-left w-full cursor-pointer">
          <div className="flex items-start gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors line-clamp-1 leading-snug">
                {issue.title}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">#{issue.number}</p>
            </div>
          </div>
        </button>
      </td>

      {/* Repository */}
      <td className="px-4 py-3.5">
        <RepoCellContent fullName={issue.repository?.fullName} onClick={() => onOpen(issue)} />
      </td>

      {/* Labels */}
      <td className="hidden md:table-cell px-4 py-3.5">
        <LabelsCellContent labels={issue.labels} />
      </td>

      {/* Stars */}
      <td className="hidden lg:table-cell px-4 py-3.5">
        {stars ? (
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border ${starTier}`}>
            <Star className="w-2.5 h-2.5 fill-current" />
            {formatCount(stars)}
          </span>
        ) : <span className="text-[10px] text-gray-700">—</span>}
      </td>

      {/* Created */}
      <td className="hidden lg:table-cell px-4 py-3.5 text-center">
        <span className="text-xs text-gray-600 whitespace-nowrap">{formatRelativeDate(issue.createdAt)}</span>
      </td>

      {/* Comments + actions */}
      <td className="px-4 py-3.5">
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-gray-600 w-4 text-center">{issue.commentsCount || '—'}</span>
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onOpen(issue)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-violet-400 bg-violet-400/[0.08] hover:bg-violet-400/[0.15] transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              Explain
            </button>
            <a
              href={issue.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="p-1 text-gray-600 hover:text-gray-300 transition-colors rounded"
            >
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </td>
    </tr>
  );
}

/* ── Page ── */
const SuggestedIssues = () => {
  usePageTitle('Opportunities');

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
      <div className="px-6 pt-6 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-white">Suggested Issues</h1>
            <p className="text-xs text-gray-600 mt-0.5">
              {allIssues.length > 0
                ? `${totalCount.toLocaleString()} issues found · showing ${allIssues.length}`
                : 'Beginner-friendly issues curated for you'}
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 pb-4 border-b border-white/[0.05]">
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
            defaultValue="0"
          />

          {/* Spacer absorbs remaining width */}
          <div className="flex-1" />

          <div className="h-5 w-px bg-white/[0.08]" />

          {/* Famous repos toggle */}
          <button
            onClick={() => setFamousOnly(prev => !prev)}
            className={`flex items-center gap-2 h-8 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
              famousOnly
                ? 'border-amber-500/40 bg-amber-500/[0.08] text-amber-300'
                : 'border-white/[0.10] bg-[#111927] text-gray-400 hover:border-white/[0.18] hover:text-gray-200'
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
          <div className="p-6"><CardSkeletonList count={6} /></div>
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
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#0B1222] border-b border-white/[0.06]">
                    <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-[36%]">Title</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-[16%]">Repository</th>
                    <th className="hidden md:table-cell px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-[18%]">Labels</th>
                    <th className="hidden lg:table-cell px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-[10%]">Stars</th>
                    <th className="hidden lg:table-cell px-4 py-3 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-[10%]">Created</th>
                    <th className="px-4 py-3 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-[10%]">
                      <MessageSquare className="w-3 h-3 mx-auto" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {allIssues.map(issue => (
                    <IssueRow
                      key={`${issue.repository?.fullName}-${issue.number}`}
                      issue={issue}
                      onOpen={handleOpenIssue}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {hasNextPage && (
              <LoadMoreButton onClick={() => fetchNextPage()} isLoading={isFetchingNextPage} />
            )}

            {!hasNextPage && allIssues.length > 0 && (
              <p className="text-center text-xs text-gray-700 py-5 border-t border-white/[0.04]">All issues loaded</p>
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
