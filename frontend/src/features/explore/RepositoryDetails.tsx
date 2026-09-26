import { useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQuery, useInfiniteQuery, useQueryClient, keepPreviousData, useMutation } from '@tanstack/react-query';
import {
  GitFork, GitPullRequest, CircleDot, ExternalLink, BookOpen, ChevronDown, ChevronUp,
  Sparkles, Star, Eye, Scale, Tag,
} from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { formatRelativeDate } from '../../utils/formatDate';
import { getRepositoryDetails, getTopContributors, getLotteryContributors, getMergeLikelihood, getRepositoryPullRequests, getPullRequestDetails, getRepositoryIssues, onboardRepo, checkRepoStarred, starRepo, unstarRepo, trackOutcome } from '../../services/github';
import ReactMarkdown from 'react-markdown';
import PullRequestDetailsModal from '../../components/PullRequestDetailsModal';
import type { PullRequestDetails } from '../../types/github';
import IssueDetailsModal from '../../components/IssueDetailsModal';
import useIssueComments from '../../hooks/useIssueComments';
import { useState, useEffect, useRef, useMemo } from 'react';
import { RepositorySkeleton } from '../../components/skeletons';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { motion } from 'framer-motion';
import { LANGUAGE_COLORS } from '../../constants/languageColors';
import { formatCount } from '../../utils/formatCount';
import type { GitHubRepository as Repository } from '../../types/github';
import { extractErrorMessage } from '../../utils/extractErrorMessage';
import type { TopContributor, LotteryContributor, MergeLikelihood, PullRequest, PullRequestsResult, PullRequestCounts } from './types';
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

  const { data: repository, isLoading: repoLoading, error: repoError, refetch: refetchRepo } = useQuery<Repository>({
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
  const { data: mergeLikelihood } = useQuery<MergeLikelihood>({
    queryKey: ['merge-likelihood', owner, repo],
    queryFn: () => getMergeLikelihood(owner!, repo!),
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
  const onboardingRef = useRef<HTMLDivElement>(null);

  // Record the first look at this repo's pull requests, not every tab switch.
  const trackedPrsFor = useRef<string | null>(null);
  useEffect(() => {
    if (activeTab !== 'pullrequests' || !owner || !repo || trackedPrsFor.current === `${owner}/${repo}`) return;
    trackedPrsFor.current = `${owner}/${repo}`;
    trackOutcome('opened_prs', owner, repo);
  }, [activeTab, owner, repo]);

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
    requestAnimationFrame(() => onboardingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
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
  if (!repository || !owner || !repo) {
    const status = (repoError as { response?: { status?: number } } | null)?.response?.status;
    return (
      <div className="p-6 max-w-2xl">
        <ErrorDisplay
          title={status === 404 ? 'Repository not found' : status === 429 || status === 403 ? 'GitHub rate limit reached' : "Couldn't load this repository"}
          error={status === 404
            ? `${owner}/${repo} doesn't exist or is private.`
            : status === 429 || status === 403
              ? 'GitHub is limiting requests right now. Wait a minute and try again.'
              : extractErrorMessage(repoError)}
          onRetry={status === 404 ? undefined : () => refetchRepo()}
        />
      </div>
    );
  }

  const langColor = LANGUAGE_COLORS[repository.language] ?? '#6b7280';
  
  const likelihood = mergeLikelihood?.likelihood ?? 'unknown';
  const likelihoodTier = likelihood === 'high' ? { label: 'High', cls: 'text-green-300 bg-green-500/10 border-green-500/25' }
    : likelihood === 'medium' ? { label: 'Medium', cls: 'text-amber-300 bg-amber-400/10 border-amber-400/25' }
    : likelihood === 'low' ? { label: 'Low', cls: 'text-red-300 bg-red-500/10 border-red-500/25' }
    : { label: 'Not enough data', cls: 'text-gray-400 bg-white/[0.04] border-white/[0.1]' };
  const days = mergeLikelihood?.median_days_to_merge;
  const daysLabel = days === null || days === undefined ? null : days < 1 ? '<1 day' : `${Math.round(days)} day${Math.round(days) === 1 ? '' : 's'}`;

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
              className={`flex items-center gap-2 h-9 px-3.5 rounded-lg text-[13px] font-semibold border active:scale-[0.97] transition-all cursor-pointer disabled:opacity-50 ${
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
              className="lg:hidden flex items-center gap-2 h-9 px-3.5 rounded-lg text-[13px] font-semibold border border-blue-500/30 bg-blue-500/[0.08] text-blue-300 hover:bg-blue-500/[0.14] disabled:opacity-50 transition-all cursor-pointer"
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
          <div ref={onboardingRef} className="mx-6 mt-5 rounded-xl border border-blue-500/20 overflow-hidden scroll-mt-4">
            <button
              onClick={() => setShowOnboarding(v => !v)}
              className="w-full flex items-center justify-between px-5 py-3 bg-blue-500/[0.06] hover:bg-blue-500/[0.10] text-xs font-semibold text-blue-300 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5" />
                Onboarding guide
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
                <div className="prose prose-sm prose-invert max-w-[75ch] text-[13px] leading-relaxed prose-p:text-gray-300 prose-li:text-gray-300 prose-headings:text-white prose-headings:font-semibold prose-h1:text-base prose-h2:text-[15px] prose-h3:text-sm prose-code:text-blue-200 prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[#1D2030]">
                  <ReactMarkdown>{onboarding}</ReactMarkdown>
                </div>
              ) : (
                <div className="space-y-2.5" role="status" aria-label="Generating onboarding guide">
                  <p className="text-[12px] text-gray-500 mb-3">Reading the README, CONTRIBUTING guide and recent pull requests</p>
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contribution health */}
        <section aria-label="Contribution health" className="mx-6 mt-5 rounded-xl bg-[#2E3245] border border-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <div className="flex items-center gap-2 px-4 pt-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Should you contribute here?</p>
          </div>
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
            {/* Merge Likelihood */}
            <div className="p-4 flex items-center gap-4">
              <div className="w-14 h-14 shrink-0 rounded-full bg-white/[0.03] border border-white/[0.07] flex flex-col items-center justify-center">
                <span className="text-[15px] font-bold text-white tabular leading-none">
                  {mergeLikelihood && mergeLikelihood.merge_rate !== null && likelihood !== 'unknown' ? `${mergeLikelihood.merge_rate}%` : '–'}
                </span>
                <span className="text-[9px] text-gray-500 mt-1">merged</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold text-gray-100">Merge likelihood</p>
                  {mergeLikelihood && (
                    <span className={`text-[10px] font-semibold px-1.5 py-px rounded-md border ${likelihoodTier.cls}`}>{likelihoodTier.label}</span>
                  )}
                </div>
                <p className="text-[12px] text-gray-400 mt-1 leading-relaxed">
                  {!mergeLikelihood
                    ? 'How often outside contributors get their pull requests merged.'
                    : likelihood === 'unknown'
                      ? `Only ${mergeLikelihood.sample_size} recent PR${mergeLikelihood.sample_size === 1 ? '' : 's'} from outside contributors, too few to judge.`
                      : <>
                          {mergeLikelihood.merged_count} of {mergeLikelihood.sample_size} recent outside PRs merged
                          {daysLabel && <>, usually within <span className="text-gray-200 font-semibold">{daysLabel}</span></>}.
                          {mergeLikelihood.waiting_count > 0 && <> {mergeLikelihood.waiting_count} waiting 30+ days.</>}
                        </>}
                </p>
              </div>
            </div>

            {/* Lottery Factor */}
            <div className="p-4">
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-semibold text-gray-100">Lottery factor</p>
                {lottery.length > 0 && (
                  <span className={`text-[10px] font-semibold px-1.5 py-px rounded-md border ${lotteryRisk.cls}`}>{lotteryRisk.label} risk</span>
                )}
              </div>
              <p className="text-[12px] text-gray-400 mt-1">{lottery.length > 0 ? lotteryRisk.tip : 'Not enough recent pull request activity to measure.'}</p>
              {lottery.length > 0 && (
                <>
                  <div className="flex h-1.5 rounded-full overflow-hidden gap-px mt-3">
                    {lottery.map((c, i) => (
                      <div key={c.login} title={`${c.login}: ${c.percentage}%`}
                        style={{ width: `${c.percentage}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />
                    ))}
                    {(() => { const rest = Math.max(0, 100 - lottery.reduce((sum, c) => sum + c.percentage, 0)); return rest > 0 ? <div style={{ width: `${rest}%` }} className="bg-white/[0.06]" /> : null; })()}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5">
                    {lottery.slice(0, 4).map((c, i) => (
                      <div key={c.login} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />
                        <span className="text-[12px] text-gray-300">{c.login}</span>
                        <span className="text-[11px] text-gray-500 tabular">{c.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Main grid: issues/PRs + sidebar */}
        <div className="flex flex-col lg:flex-row gap-0 mt-5">

          {/* Issues / PRs */}
          <div className="flex-1 min-w-0 px-6 pb-8">

            {/* Tab bar */}
            <div className="flex items-center gap-1 mb-4 border-b border-white/[0.06]" role="tablist">
              {[
                { id: 'issues' as const, icon: CircleDot, label: 'Issues', count: issuesData?.pages[0]?.totalCount ?? 0, iconCls: 'text-green-400' },
                { id: 'pullrequests' as const, icon: GitPullRequest, label: 'Pull requests', count: currentTotalCount, iconCls: 'text-blue-400' },
              ].map(({ id, icon: Icon, label, count, iconCls }) => (
                <button key={id} onClick={() => setActiveTab(id)} role="tab" aria-selected={activeTab === id}
                  className={`relative flex items-center gap-2 px-3 h-10 text-[13px] font-semibold transition-colors cursor-pointer ${
                    activeTab === id ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}>
                  <Icon className={`w-3.5 h-3.5 ${activeTab === id ? iconCls : 'text-gray-600'}`} />
                  {label}
                  {count > 0 && <span className="px-1.5 h-[18px] inline-flex items-center rounded-full bg-white/[0.06] text-[10px] text-gray-400 tabular">{formatCount(count)}</span>}
                  {activeTab === id && (
                    <motion.span layoutId="repo-tab" className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full bg-blue-400"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
                  )}
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
          <RepoSidebar repository={repository} topContributors={topContributors} onOnboard={handleOnboard} isOnboarding={isOnboarding} />
        </div>
      </div>

      <PullRequestDetailsModal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} pullRequestDetails={prDetails} isLoading={isLoadingDetails} />
      <IssueDetailsModal isOpen={isCommentsModalOpen} onClose={() => { handleCloseComments(); setSelectedIssue(null); }} issue={selectedIssue} comments={allComments} isLoadingComments={isLoadingComments} hasMoreComments={hasMoreComments} isLoadingMore={isLoadingMore} onLoadMore={onLoadMore} onAddComment={handleAddComment} owner={owner} repo={repo} repoLanguage={repository.language} repoDescription={repository.description} hideRepoLink />
    </div>
  );
};

export default RepositoryDetails;
