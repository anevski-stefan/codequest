import { useState, useMemo } from 'react';
import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { Star, MessageSquare, ExternalLink, Sparkles, Trophy, Filter } from 'lucide-react';
import { getSuggestedIssues } from '../../services/github';
import type { Issue } from '../../types/github';
import { CardSkeletonList } from '../../components/skeletons';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { usePageTitle } from '../../hooks/usePageTitle';
import useIssueComments from '../../hooks/useIssueComments';
import IssueDetailsModal from '../../components/IssueDetailsModal';
import { getLabelColors } from '../dashboard/utils/filterUtils';
import { formatRelativeDate } from '../../utils/formatDate';

const LANGUAGES = [
  { value: '', label: 'Any language' },
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
  { value: 'week', label: 'Last week' },
  { value: 'month', label: 'Last month' },
  { value: 'year', label: 'Last year' },
  { value: 'all', label: 'All time' },
];

const COMPETITION = [
  { value: '0', label: 'No competition (0 comments)' },
  { value: '1-5', label: 'Low (1–5 comments)' },
  { value: '', label: 'Any' },
];

function formatStars(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

function StarBadge({ stars }: { stars?: number }) {
  if (!stars) return null;
  const tier =
    stars >= 50000 ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' :
    stars >= 10000 ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20' :
    'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${tier}`}>
      <Star className="w-3 h-3 fill-current" />
      {formatStars(stars)}
    </span>
  );
}

function IssueCard({
  issue,
  onOpen,
}: {
  issue: Issue;
  onOpen: (issue: Issue) => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col gap-3 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all">
      {/* Repo header */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <button
          onClick={() => onOpen(issue)}
          className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline truncate"
        >
          {issue.repository?.fullName}
        </button>
        <StarBadge stars={issue.repoStars} />
      </div>

      {/* Issue title */}
      <button
        onClick={() => onOpen(issue)}
        className="text-left text-gray-900 dark:text-white font-medium leading-snug hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        {issue.title}
      </button>

      {/* Labels */}
      {issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {issue.labels.map(label => (
            <span
              key={label.name}
              className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full"
              style={getLabelColors(label.color)}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 mt-auto">
        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" />
            {issue.commentsCount}
          </span>
          <span>{formatRelativeDate(issue.createdAt)}</span>
          <span>#{issue.number}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpen(issue)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            Explain
          </button>
          <a
            href={issue.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Open on GitHub"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

const SuggestedIssues = () => {
  usePageTitle('Opportunities');

  const [language, setLanguage] = useState('');
  const [timeFrame, setTimeFrame] = useState('month');
  const [commentsRange, setCommentsRange] = useState('0');
  const [famousOnly, setFamousOnly] = useState(false);

  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    allComments,
    isLoadingComments,
    hasMoreComments,
    isLoadingMore,
    onLoadMore,
    handleViewComments,
    handleCloseComments,
    handleAddComment,
  } = useIssueComments();

  const handleOpenIssue = (issue: Issue) => {
    setSelectedIssue(issue);
    setIsModalOpen(true);
    handleViewComments(issue);
  };

  const handleClose = () => {
    setIsModalOpen(false);
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
    <div className="w-full p-6 dark:bg-[#0B1222] mt-[64px]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Open Source Opportunities
          </h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Beginner-friendly issues from real projects — ready to contribute and add to your CV.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />

          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {LANGUAGES.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>

          <select
            value={timeFrame}
            onChange={e => setTimeFrame(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TIME_FRAMES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <select
            value={commentsRange}
            onChange={e => setCommentsRange(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {COMPETITION.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 cursor-pointer select-none ml-auto">
            <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              Famous repos only
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={famousOnly}
              onClick={() => {
                const next = !famousOnly;
                setFamousOnly(next);
                // Famous repos get comments fast — reset competition filter so results aren't empty
                if (next) setCommentsRange('');
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                famousOnly ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  famousOnly ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </label>
        </div>
      </div>

      {/* Results count */}
      {!isLoading && allIssues.length > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          {totalCount.toLocaleString()} issues found · showing {allIssues.length}
        </p>
      )}

      {/* Content */}
      {isLoading && <CardSkeletonList count={6} />}

      {!isLoading && error instanceof Error && (
        <ErrorDisplay
          title={isRateLimitError ? 'GitHub API rate limit exceeded' : 'Failed to load issues'}
          error={isRateLimitError ? 'Please wait a few minutes before trying again.' : error.message}
        />
      )}

      {!isLoading && !error && allIssues.length === 0 && (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No issues found for these filters. Try widening the time frame or removing the language filter.</p>
        </div>
      )}

      {!isLoading && allIssues.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {allIssues.map(issue => (
            <IssueCard
              key={`${issue.repository?.fullName}-${issue.number}`}
              issue={issue}
              onOpen={handleOpenIssue}
            />
          ))}
        </div>
      )}

      {hasNextPage && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}

      <IssueDetailsModal
        isOpen={isModalOpen}
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
