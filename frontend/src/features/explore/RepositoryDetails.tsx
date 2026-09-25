import { useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQuery, useInfiniteQuery, useQueryClient, keepPreviousData, useMutation } from '@tanstack/react-query';
import {
  GitFork, GitPullRequest, CircleDot, ExternalLink, BookOpen, ChevronDown, ChevronUp,
  Sparkles, Star, Eye, Scale, Tag, Loader2,
} from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { formatRelativeDate } from '../../utils/formatDate';
import { getRepositoryDetails, getTopContributors, getLotteryContributors, getContributorConfidence, getRepositoryPullRequests, getPullRequestDetails, getRepositoryIssues, onboardRepo, checkRepoStarred, starRepo, unstarRepo } from '../../services/github';
import ReactMarkdown from 'react-markdown';
import PullRequestDetailsModal from '../../components/PullRequestDetailsModal';
import type { PullRequestDetails } from '../../types/github';
import IssueDetailsModal from '../../components/IssueDetailsModal';
import useIssueComments from '../../hooks/useIssueComments';
import { useState, useEffect, useRef, useMemo } from 'react';
import { RepositorySkeleton } from '../../components/skeletons';
import { LANGUAGE_COLORS } from '../../constants/languageColors';
import { formatCount } from '../../utils/formatCount';
import type { GitHubRepository as Repository } from '../../types/github';
import { extractErrorMessage } from '../../utils/extractErrorMessage';
import type { TopContributor, LotteryContributor, ContributorConfidence, PullRequest, PullRequestsResult, PullRequestCounts } from './types';
import { BAR_COLORS } from './types';
import { RepoSidebar } from './components/RepoSidebar';
import { RepoIssuesList } from './components/RepoIssuesList';
import { RepoPullRequestsList } from './components/RepoPullRequestsList';

const RepositoryDetails = () => {
  const { owner, repo } = useParams();
  const [searchParams] = useSearchParams();
  const focusedIssueNumber = searchParams.get('issue') ? Number(searchParams.get('issue')) : null;
  const issuesSectionRef = useRef<HTMLDivElement>(null);
  const focusedIssueRef = useRef<HTMLDivElement>(null);
  const hasScrolledToFocused = useRef(false);
  const queryClient = useQueryClient();
  usePageTitle(`${owner}/${repo}`);

  const { data: repository, isLoading: repoLoading } = useQuery<Repository>({
    queryKey: ['repository', owner, repo],
    queryFn: () => getRepositoryDetails(owner!, repo!),
    enabled: !!owner && !!repo, staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000,
  });
  const { data: topContributors } = useQuery<TopContributor[]>({
    queryKey: ['top-contributors', owner, repo],
    queryFn: () => getTopContributors(owner!, repo!),
    enabled: !!owner && !!repo, staleTime: 15 * 60 * 1000, gcTime: 60 * 60 * 1000,
  });
  const { data: lotteryContributors } = useQuery<LotteryContributor[]>({
    queryKey: ['lottery-contributors', owner, repo],
    queryFn: () => getLotteryContributors(owner!, repo!),
    enabled: !!owner && !!repo && !!repository, staleTime: 15 * 60 * 1000, gcTime: 60 * 60 * 1000,
  });
  const { data: contributorConfidence } = useQuery<ContributorConfidence>({
    queryKey: ['contributor-confidence', owner, repo],
    queryFn: () => getContributorConfidence(owner!, repo!),
    enabled: !!owner && !!repo && !!repository, staleTime: 15 * 60 * 1000, gcTime: 60 * 60 * 1000,
  });
  const { data: issuesData, isLoading: issuesLoading, isError: issuesError, error: issuesErrorObj, fetchNextPage: fetchNextIssues, hasNextPage: hasNextIssues, isFetchingNextPage: isFetchingNextIssues } =
    useInfiniteQuery({
      queryKey: ['repo-issues', owner, repo],
      queryFn: ({ pageParam = 1 }) => getRepositoryIssues(owner!, repo!, pageParam as number),
      initialPageParam: 1,
      getNextPageParam: (lastPage, allPages) => lastPage.hasMore ? allPages.length + 1 : undefined,
      enabled: !!owner && !!repo, staleTime: 2 * 60 * 1000,
    });
  const allIssues = useMemo(() => issuesData?.pages.flatMap(p => p.issues) ?? [], [issuesData]);

  useEffect(() => {
    if (focusedIssueNumber && focusedIssueRef.current && !hasScrolledToFocused.current) {
      focusedIssueRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      hasScrolledToFocused.current = true;
    }
  }, [focusedIssueNumber, allIssues]);

  const [selectedIssue, setSelectedIssue] = useState<(typeof allIssues)[0] | null>(null);
  const { isCommentsModalOpen, allComments, isLoadingComments, hasMoreComments, isLoadingMore, onLoadMore, handleViewComments, handleCloseComments, handleAddComment } = useIssueComments();

  const [activeTab, setActiveTab] = useState<'issues' | 'pullrequests'>('issues');
  const [prState, setPrState] = useState<'open' | 'closed'>('open');
  const [isSwitching, setIsSwitching] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [prDetails, setPrDetails] = useState<PullRequestDetails | undefined>(undefined);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [onboarding, setOnboarding] = useState('');
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const { data: isStarred, isLoading: starredLoading } = useQuery<boolean>({
    queryKey: ['repo-starred', owner, repo],
    queryFn: () => checkRepoStarred(owner!, repo!),
    enabled: !!owner && !!repo && !!repository, staleTime: 5 * 60 * 1000,
  });

  const starMutation = useMutation({
    mutationFn: (target: boolean) => target ? starRepo(owner!, repo!) : unstarRepo(owner!, repo!),
    onSuccess: (_, target) => {
      queryClient.setQueryData(['repo-starred', owner, repo], target);
      if (!target) {
        type StarredPage = { repos: { full_name: string }[]; hasMore: boolean };
        queryClient.setQueryData<{ pages: StarredPage[]; pageParams: unknown[] }>(['starred-repos'], old =>
          old ? { ...old, pages: old.pages.map(p => ({ ...p, repos: p.repos.filter(r => r.full_name !== `${owner}/${repo}`) })) } : old
        );
      } else {
        queryClient.invalidateQueries({ queryKey: ['starred-repos'] });
      }
      toast.success(target ? 'Repository starred' : 'Repository unstarred');
    },
    onError: (err: unknown) => {
      toast.error(`Failed: ${extractErrorMessage(err)}`);
    },
  });

  const handleOnboard = () => {
    if (!owner || !repo) return;
    setOnboarding(''); setOnboardingError(null); setIsOnboarding(true); setShowOnboarding(true);
    onboardRepo({ owner, repo, onChunk: t => setOnboarding(prev => prev + t), onDone: () => setIsOnboarding(false), onError: err => { setOnboardingError(err); setIsOnboarding(false); } });
  };

  const { data: pullRequestsData, isLoading: prsLoading, fetchNextPage: fetchNextPrs, hasNextPage: hasNextPrs, isFetchingNextPage: isFetchingNextPrs } =
    useInfiniteQuery({
      queryKey: ['pull-requests', owner, repo, prState],
      queryFn: ({ pageParam = 1 }) => getRepositoryPullRequests(owner!, repo!, prState, pageParam as number),
      initialPageParam: 1,
      getNextPageParam: (lastPage, allPages) => lastPage.hasMore ? allPages.length + 1 : undefined,
      enabled: !!owner && !!repo && activeTab === 'pullrequests', placeholderData: keepPreviousData, staleTime: 2 * 60 * 1000,
    });
  const allPullRequests = useMemo(() => pullRequestsData?.pages.flatMap(p => p.pullRequests) ?? [], [pullRequestsData]);
  const currentTotalCount = pullRequestsData?.pages[0]?.totalCount || 0;
  useEffect(() => { setIsSwitching(false); }, [prState]);

  const { data: prCounts } = useQuery<PullRequestCounts>({
    queryKey: ['pull-request-counts', owner, repo],
    queryFn: async () => {
      const openData = queryClient.getQueryData(['pull-requests', owner, repo, 'open']) as { pages: PullRequestsResult[] } | undefined;
      const closedData = queryClient.getQueryData(['pull-requests', owner, repo, 'closed']) as { pages: PullRequestsResult[] } | undefined;
      if (openData && closedData) return { open: openData.pages[0]?.totalCount || 0, closed: closedData.pages[0]?.totalCount || 0 };
      const [od, cd] = await Promise.all([getRepositoryPullRequests(owner!, repo!, 'open', 1), getRepositoryPullRequests(owner!, repo!, 'closed', 1)]);
      return { open: od.totalCount, closed: cd.totalCount };
    },
    enabled: !!owner && !!repo && activeTab === 'pullrequests', staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000,
  });

  const prefetchPRDetails = (pr: PullRequest) => {
    queryClient.prefetchQuery({ queryKey: ['pr-details', owner, repo, pr.number], queryFn: () => getPullRequestDetails(owner!, repo!, pr.number), staleTime: 5 * 60 * 1000 });
  };
  const handleViewPullRequest = async (prNumber: number) => {
    try {
      setIsLoadingDetails(true);
      const details = await getPullRequestDetails(owner!, repo!, prNumber);
      if (!details || typeof details === 'string') throw new Error('Invalid PR details');
      setPrDetails(details); setIsDetailsModalOpen(true);
    } catch (e) { console.error(e); } finally { setIsLoadingDetails(false); }
  };

  if (repoLoading) return <RepositorySkeleton />;
  if (!repository || !owner || !repo) return null;

  const langColor = LANGUAGE_COLORS[repository.language] ?? '#6b7280';
  const pct = contributorConfidence?.percentage ?? 0;
  const confidenceTier = pct >= 75 ? { label: 'Strong', color: '#22c55e', cls: 'text-green-400 bg-green-500/10 border-green-500/20' }
    : pct >= 50 ? { label: 'Good', color: '#3b82f6', cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20' }
    : pct >= 25 ? { label: 'Moderate', color: '#f59e0b', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' }
    : { label: 'Low', color: '#ef4444', cls: 'text-red-400 bg-red-500/10 border-red-500/20' };

  const lottery = lotteryContributors ?? [];
  const topLotteryPct = lottery[0]?.percentage ?? 0;
  const lotteryRisk = topLotteryPct >= 80
    ? { label: 'High', cls: 'text-red-400 bg-red-500/10 border-red-500/20', tip: 'One person leaving would stall most activity.' }
    : topLotteryPct >= 50
    ? { label: 'Medium', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20', tip: 'A few departures could significantly slow the project.' }
    : { label: 'Low', cls: 'text-green-400 bg-green-500/10 border-green-500/20', tip: 'Contributions are spread across many people.' };

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Repo header ── */}
      <div className="shrink-0 border-b border-white/[0.05] px-6 pt-5 pb-4">
        <div className="flex items-start gap-4">
          <img src={repository.owner.avatar_url} alt={repository.owner.login} width={44} height={44}
            loading="lazy" decoding="async" className="w-11 h-11 rounded-xl ring-1 ring-white/[0.08] shrink-0 mt-0.5" />

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3 flex-wrap">
              <a href={repository.html_url} target="_blank" rel="noopener noreferrer"
                className="text-base font-bold text-white hover:text-blue-300 transition-colors flex items-center gap-1.5">
                <span className="text-gray-500 font-normal">{repository.owner.login}/</span>{repository.full_name.split('/')[1]}
                <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
              </a>
              {repository.language && (
                <span className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border"
                  style={{ color: langColor, backgroundColor: `${langColor}14`, borderColor: `${langColor}30` }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: langColor }} />
                  {repository.language}
                </span>
              )}
              {repository.license && (
                <span className="flex items-center gap-1 text-[11px] text-gray-600">
                  <Scale className="w-3 h-3" />{repository.license.name}
                </span>
              )}
            </div>

            {repository.description && (
              <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-2xl">{repository.description}</p>
            )}

            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-1 text-xs text-gray-600">
                <Star className="w-3 h-3 text-amber-500/70" />{formatCount(repository.stargazers_count)}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-600">
                <GitFork className="w-3 h-3" />{formatCount(repository.forks_count)}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-600">
                <Eye className="w-3 h-3" />{formatCount(repository.watchers_count)}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-600">
                <CircleDot className="w-3 h-3 text-green-500/70" />{repository.open_issues_count} issues
              </span>
              <span className="text-xs text-gray-500">Updated {formatRelativeDate(repository.updated_at)}</span>
            </div>

            {repository.topics?.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {repository.topics.slice(0, 8).map(t => (
                  <span key={t} className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-500/[0.08] border border-blue-500/[0.15] text-blue-400">
                    <Tag className="w-2.5 h-2.5" />{t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => starMutation.mutate(!isStarred)}
              disabled={starredLoading || starMutation.isPending}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer disabled:opacity-50 ${
                isStarred
                  ? 'border-amber-500/30 bg-amber-500/[0.08] text-amber-400 hover:bg-amber-500/[0.14]'
                  : 'border-white/[0.10] bg-[#363B52] text-gray-400 hover:text-white hover:border-white/[0.18]'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
              {isStarred ? 'Starred' : 'Star'}
            </button>
            <button
              onClick={handleOnboard}
              disabled={isOnboarding}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border border-blue-500/30 bg-blue-500/[0.08] text-blue-400 hover:bg-blue-500/[0.14] disabled:opacity-50 transition-all cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              {isOnboarding ? 'Generating…' : 'Onboarding'}
              <Sparkles className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Onboarding panel */}
        {showOnboarding && (
          <div className="mx-6 mt-5 rounded-xl border border-blue-500/20 overflow-hidden">
            <button
              onClick={() => setShowOnboarding(v => !v)}
              className="w-full flex items-center justify-between px-5 py-3 bg-blue-500/[0.06] hover:bg-blue-500/[0.10] text-xs font-semibold text-blue-300 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5" />
                AI Onboarding Guide — {repository.full_name}
              </span>
              <span className="flex items-center gap-2">
                {isOnboarding && <span className="text-blue-400 animate-pulse">Generating…</span>}
                {showOnboarding ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            </button>
            <div className="px-6 py-5 bg-[#2E3245]">
              {onboardingError ? (
                <p className="text-xs text-red-400">{onboardingError}</p>
              ) : onboarding ? (
                <div className="prose prose-sm prose-invert max-w-none text-xs leading-relaxed">
                  <ReactMarkdown>{onboarding}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex items-center gap-3 py-3 text-xs text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Reading README, CONTRIBUTING.md, recent PRs…
                </div>
              )}
            </div>
          </div>
        )}

        {/* Metric strip */}
        <div className="mx-6 mt-4 rounded-xl bg-[#2E3245] border border-white/[0.07] flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06]">

          {/* Contributor Confidence */}
          <div className="flex-1 p-3.5 flex items-center gap-3">
            <div className="relative w-11 h-11 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <path d="M 50,50 m 0,-38 a 38,38 0 1 1 0,76 a 38,38 0 1 1 0,-76"
                  fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="11" />
                <path d="M 50,50 m 0,-38 a 38,38 0 1 1 0,76 a 38,38 0 1 1 0,-76"
                  fill="none" stroke={confidenceTier.color} strokeWidth="11" strokeLinecap="round"
                  strokeDasharray={`${pct * 2.39} 239`} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">{pct}%</span>
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[11px] font-semibold text-gray-300">Contributor Confidence</p>
                <span className={`text-[10px] font-semibold px-1.5 py-px rounded-full border ${confidenceTier.cls}`}>
                  {confidenceTier.label}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 line-clamp-1">{contributorConfidence?.message}</p>
              <div className="flex items-center gap-4 mt-1.5">
                {[
                  { val: topContributors?.length ?? '—', label: 'top' },
                  { val: topContributors?.[0] ? `${topContributors[0].percentage}%` : '—', label: 'lead share' },
                  { val: lottery.length || '—', label: 'core' },
                ].map(({ val, label }) => (
                  <div key={label} className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-white tabular-nums">{val}</span>
                    <span className="text-[9px] text-gray-500">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* OpenSSF Score */}
          <div className="flex-1 p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[11px] font-semibold text-gray-300">OpenSSF Scorecard</p>
              <span className="text-[10px] font-semibold px-1.5 py-px rounded-full border text-gray-500 bg-white/[0.03] border-white/[0.07]">N/A</span>
            </div>
            <p className="text-[11px] text-gray-500 leading-snug">Security scorecard not yet available for this repository.</p>
          </div>

          {/* Lottery Factor */}
          <div className="flex-1 p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[11px] font-semibold text-gray-300">Lottery Factor</p>
              <span className={`text-[10px] font-semibold px-1.5 py-px rounded-full border ${lotteryRisk.cls}`}>
                {lotteryRisk.label}
              </span>
            </div>
            {lottery.length > 0 && (
              <div className="flex h-1 rounded-full overflow-hidden gap-px mb-2">
                {lottery.map((c, i) => (
                  <div key={c.login} title={`${c.login}: ${c.percentage}%`}
                    style={{ width: `${c.percentage}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />
                ))}
                {(() => { const rest = Math.max(0, 100 - lottery.reduce((s, c) => s + c.percentage, 0)); return rest > 0 ? <div style={{ width: `${rest}%` }} className="bg-white/[0.05]" /> : null; })()}
              </div>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {lottery.slice(0, 3).map((c, i) => (
                <div key={c.login} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />
                  <img src={c.avatar_url} alt={c.login} width={16} height={16} loading="lazy" decoding="async" className="w-4 h-4 rounded-full shrink-0" />
                  <span className="text-[11px] text-gray-300">{c.login}</span>
                  <span className="text-[10px] text-gray-500 tabular-nums">{c.percentage}%</span>
                </div>
              ))}
              {lottery.length === 0 && <p className="text-[11px] text-gray-500">No recent PR data.</p>}
            </div>
          </div>
        </div>

        {/* Main grid: issues/PRs + sidebar */}
        <div className="flex flex-col lg:flex-row gap-0 mt-5">

          {/* Issues / PRs */}
          <div className="flex-1 min-w-0 px-6 pb-8">

            {/* Tab bar */}
            <div className="flex items-center gap-1 mb-4 border-b border-white/[0.05]">
              {[
                { id: 'issues' as const, icon: CircleDot, label: 'Issues', count: issuesData?.pages[0]?.totalCount ?? 0, iconCls: 'text-green-400' },
                { id: 'pullrequests' as const, icon: GitPullRequest, label: 'Pull Requests', count: currentTotalCount, iconCls: 'text-blue-400' },
              ].map(({ id, icon: Icon, label, count, iconCls }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all cursor-pointer -mb-px ${
                    activeTab === id ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}>
                  <Icon className={`w-3.5 h-3.5 ${activeTab === id ? iconCls : 'text-gray-600'}`} />
                  {label}
                  <span className="text-[10px] text-gray-500 ml-0.5">{count}</span>
                </button>
              ))}
            </div>

            {/* Issues */}
            {activeTab === 'issues' && (
              <div ref={issuesSectionRef}>
                <RepoIssuesList
                  issues={allIssues}
                  isLoading={issuesLoading}
                  isError={issuesError}
                  error={issuesErrorObj instanceof Error ? issuesErrorObj.message : undefined}
                  focusedIssueNumber={focusedIssueNumber}
                  focusedIssueRef={focusedIssueRef}
                  onSelectIssue={issue => { setSelectedIssue(issue); handleViewComments(issue); }}
                  hasNextPage={!!hasNextIssues}
                  isFetchingNextPage={isFetchingNextIssues}
                  fetchNextPage={fetchNextIssues}
                />
              </div>
            )}

            {/* Pull Requests */}
            {activeTab === 'pullrequests' && (
              <RepoPullRequestsList
                pullRequests={allPullRequests}
                isLoading={prsLoading}
                prState={prState}
                setPrState={setPrState}
                prCounts={prCounts}
                isSwitching={isSwitching}
                setIsSwitching={setIsSwitching}
                currentTotalCount={currentTotalCount}
                hasNextPage={!!hasNextPrs}
                isFetchingNextPage={isFetchingNextPrs}
                fetchNextPage={fetchNextPrs}
                onViewPullRequest={handleViewPullRequest}
                onPrefetchPRDetails={prefetchPRDetails}
              />
            )}
          </div>

          {/* Sidebar */}
          <RepoSidebar repository={repository} topContributors={topContributors} />
        </div>
      </div>

      <PullRequestDetailsModal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} pullRequestDetails={prDetails} isLoading={isLoadingDetails} />
      <IssueDetailsModal isOpen={isCommentsModalOpen} onClose={() => { handleCloseComments(); setSelectedIssue(null); }} issue={selectedIssue} comments={allComments} isLoadingComments={isLoadingComments} hasMoreComments={hasMoreComments} isLoadingMore={isLoadingMore} onLoadMore={onLoadMore} onAddComment={handleAddComment} owner={owner} repo={repo} repoLanguage={repository.language} repoDescription={repository.description} hideRepoLink />
    </div>
  );
};

export default RepositoryDetails;
