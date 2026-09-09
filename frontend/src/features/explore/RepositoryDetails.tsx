import { useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQuery, useInfiniteQuery, useQueryClient, keepPreviousData, useMutation } from '@tanstack/react-query';
import {
  GitFork, GitPullRequest, MessageSquare, GitCommit, Plus, Minus, FileText,
  CircleDot, ExternalLink, BookOpen, ChevronDown, ChevronUp, Sparkles, Star,
  Users, ShieldCheck, TrendingUp, Eye, Scale, Tag, Loader2,
} from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { formatRelativeDate } from '../../utils/formatDate';
import { getRepositoryDetails, getTopContributors, getLotteryContributors, getContributorConfidence, getRepositoryPullRequests, getPullRequestDetails, getRepositoryIssues, onboardRepo, checkRepoStarred, starRepo, unstarRepo } from '../../services/github';
import ReactMarkdown from 'react-markdown';
import { getLabelColors } from '../dashboard/utils/filterUtils';
import PullRequestDetailsModal from '../../components/PullRequestDetailsModal';
import type { PullRequestDetails } from '../../types/github';
import IssueDetailsModal from '../../components/IssueDetailsModal';
import useIssueComments from '../../hooks/useIssueComments';
import { useState, useEffect, useRef, useMemo } from 'react';
import { RepositorySkeleton } from '../../components/skeletons';
import { LANGUAGE_COLORS } from '../../constants/languageColors';
import { formatCount } from '../../utils/formatCount';
import type { GitHubRepository as Repository } from '../../types/github';
interface TopContributor { login: string; avatar_url: string; contributions: number; percentage: number; }
interface LotteryContributor { login: string; avatar_url: string; pull_requests: number; percentage: number; }
interface ContributorConfidence { percentage: number; message: string; }
interface PullRequest {
  id: number; number: number; title: string; state: string; created_at: string;
  updated_at: string; closed_at: string | null; merged_at: string | null; draft: boolean;
  user: { login: string; avatar_url: string };
  labels: Array<{ name: string; color: string }>;
  requested_reviewers: Array<{ login: string; avatar_url: string }>;
  head: { ref: string; sha: string }; base: { ref: string };
  commits: number; additions: number; deletions: number; changed_files: number;
  comments: number; review_comments: number;
}
type PullRequestsResult = { pullRequests: PullRequest[]; hasMore: boolean; totalCount: number };
interface PullRequestCounts { open: number; closed: number; }

const BAR_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

const RepositoryDetails = () => {
  const { owner, repo } = useParams();
  const [searchParams] = useSearchParams();
  const focusedIssueNumber = searchParams.get('issue') ? Number(searchParams.get('issue')) : null;
  const issuesSectionRef = useRef<HTMLDivElement>(null);
  const focusedIssueRef = useRef<HTMLDivElement>(null);
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
    enabled: !!owner && !!repo, staleTime: 15 * 60 * 1000, gcTime: 60 * 60 * 1000,
  });
  const { data: contributorConfidence } = useQuery<ContributorConfidence>({
    queryKey: ['contributor-confidence', owner, repo],
    queryFn: () => getContributorConfidence(owner!, repo!),
    enabled: !!owner && !!repo, staleTime: 15 * 60 * 1000, gcTime: 60 * 60 * 1000,
  });
  const { data: issuesData, isLoading: issuesLoading, fetchNextPage: fetchNextIssues, hasNextPage: hasNextIssues, isFetchingNextPage: isFetchingNextIssues } =
    useInfiniteQuery({
      queryKey: ['repo-issues', owner, repo],
      queryFn: ({ pageParam = 1 }) => getRepositoryIssues(owner!, repo!, pageParam as number),
      initialPageParam: 1,
      getNextPageParam: (lastPage, allPages) => lastPage.hasMore ? allPages.length + 1 : undefined,
      enabled: !!owner && !!repo, staleTime: 2 * 60 * 1000,
    });
  const allIssues = useMemo(() => issuesData?.pages.flatMap(p => p.issues) ?? [], [issuesData]);

  useEffect(() => {
    if (focusedIssueNumber && focusedIssueRef.current)
      focusedIssueRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    enabled: !!owner && !!repo, staleTime: 5 * 60 * 1000,
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
      const msg = (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error
        ?? (err as { message?: string })?.message ?? 'Unknown error';
      toast.error(`Failed: ${msg}`);
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
      enabled: !!owner && !!repo, placeholderData: keepPreviousData, staleTime: 2 * 60 * 1000,
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
    enabled: !!owner && !!repo, staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000,
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
    <div className="flex flex-col h-screen overflow-hidden">

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
                <ExternalLink className="w-3.5 h-3.5 text-gray-700" />
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
              <span className="text-xs text-gray-700">Updated {formatRelativeDate(repository.updated_at)}</span>
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
                  : 'border-white/[0.10] bg-[#111927] text-gray-400 hover:text-white hover:border-white/[0.18]'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
              {isStarred ? 'Starred' : 'Star'}
            </button>
            <button
              onClick={handleOnboard}
              disabled={isOnboarding}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border border-violet-500/30 bg-violet-500/[0.08] text-violet-400 hover:bg-violet-500/[0.14] disabled:opacity-50 transition-all cursor-pointer"
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
          <div className="mx-6 mt-5 rounded-xl border border-violet-500/20 overflow-hidden">
            <button
              onClick={() => setShowOnboarding(v => !v)}
              className="w-full flex items-center justify-between px-5 py-3 bg-violet-500/[0.06] hover:bg-violet-500/[0.10] text-xs font-semibold text-violet-300 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5" />
                AI Onboarding Guide — {repository.full_name}
              </span>
              <span className="flex items-center gap-2">
                {isOnboarding && <span className="text-violet-500 animate-pulse">Generating…</span>}
                {showOnboarding ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            </button>
            <div className="px-6 py-5 bg-[#0D1525]">
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

        {/* Metric cards */}
        <div className="grid grid-cols-3 gap-4 px-6 pt-5 pb-0">

          {/* Contributor Confidence */}
          <div className="rounded-xl bg-[#0D1525] border border-white/[0.07] p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-400">Contributor Confidence</p>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${confidenceTier.cls}`}>
                {confidenceTier.label}
              </span>
            </div>
            <div className="flex items-center gap-5 flex-1">
              <div className="relative w-20 h-20 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <path d="M 50,50 m 0,-38 a 38,38 0 1 1 0,76 a 38,38 0 1 1 0,-76"
                    fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                  <path d="M 50,50 m 0,-38 a 38,38 0 1 1 0,76 a 38,38 0 1 1 0,-76"
                    fill="none" stroke={confidenceTier.color} strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${pct * 2.39} 239`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-white">{pct}%</span>
                </div>
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                <p className="text-xs text-gray-600 leading-relaxed">{contributorConfidence?.message}</p>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {[
                    { icon: Users, val: topContributors?.length ?? '—', label: 'Top' },
                    { icon: TrendingUp, val: topContributors?.[0] ? `${topContributors[0].percentage}%` : '—', label: 'Share' },
                    { icon: ShieldCheck, val: lottery.length ?? '—', label: 'Core' },
                  ].map(({ icon: Icon, val, label }) => (
                    <div key={label} className="flex flex-col items-center gap-0.5 py-2 rounded-lg bg-white/[0.03]">
                      <Icon className="w-3 h-3 text-gray-600" />
                      <span className="text-sm font-bold text-white">{val}</span>
                      <span className="text-[9px] text-gray-700">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* OpenSSF Score */}
          <div className="rounded-xl bg-[#0D1525] border border-white/[0.07] p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-400">OpenSSF Scorecard</p>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-gray-500 bg-white/[0.03] border-white/[0.07]">
                N/A
              </span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              OpenSSF Scorecard data is not yet available for this repository.
            </p>
          </div>

          {/* Lottery Factor */}
          <div className="rounded-xl bg-[#0D1525] border border-white/[0.07] p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-400">Lottery Factor</p>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${lotteryRisk.cls}`}>
                {lotteryRisk.label}
              </span>
            </div>
            {lottery.length > 0 && (
              <div className="mb-4">
                <div className="flex h-2 rounded-full overflow-hidden gap-px mb-2">
                  {lottery.map((c, i) => (
                    <div key={c.login} title={`${c.login}: ${c.percentage}%`}
                      style={{ width: `${c.percentage}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />
                  ))}
                  {(() => { const rest = Math.max(0, 100 - lottery.reduce((s, c) => s + c.percentage, 0)); return rest > 0 ? <div style={{ width: `${rest}%` }} className="bg-white/[0.05]" /> : null; })()}
                </div>
              </div>
            )}
            <div className="space-y-2.5">
              {lottery.map((c, i) => (
                <div key={c.login} className="flex items-center gap-2.5">
                  <img src={c.avatar_url} alt={c.login} width={24} height={24} loading="lazy" decoding="async" className="w-6 h-6 rounded-full shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-xs font-medium text-gray-300 truncate">{c.login}</span>
                      <span className="text-[10px] text-gray-600 shrink-0 ml-2">{c.pull_requests} PRs · {c.percentage}%</span>
                    </div>
                    <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${c.percentage}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />
                    </div>
                  </div>
                </div>
              ))}
              {lottery.length === 0 && <p className="text-xs text-gray-700">No recent PR data available.</p>}
            </div>
            <p className="mt-3 pt-3 border-t border-white/[0.05] text-[10px] text-gray-600 leading-relaxed">{lotteryRisk.tip}</p>
          </div>
        </div>

        {/* Main grid: issues/PRs + sidebar */}
        <div className="flex gap-0 mt-5">

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
                  <span className="text-[10px] text-gray-700 ml-0.5">{count}</span>
                </button>
              ))}
            </div>

            {/* Issues */}
            {activeTab === 'issues' && (
              <div ref={issuesSectionRef}>
                {issuesLoading ? (
                  <div className="space-y-2">
                    {[...Array(6)].map((_, i) => <div key={i} className="animate-pulse h-16 rounded-xl bg-[#0D1525] border border-white/[0.05]" />)}
                  </div>
                ) : allIssues.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <CircleDot className="w-8 h-8 text-gray-700 mb-3" />
                    <p className="text-sm text-gray-500">No open issues found</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {allIssues.map(issue => {
                      const isFocused = issue.number === focusedIssueNumber;
                      return (
                        <div key={issue.id} ref={isFocused ? focusedIssueRef : undefined}
                          onClick={() => { setSelectedIssue(issue); handleViewComments(issue); }}
                          className={`group flex items-start gap-3 px-4 py-3.5 rounded-xl border cursor-pointer transition-all ${
                            isFocused
                              ? 'border-blue-500/40 bg-blue-500/[0.06] ring-1 ring-blue-500/20'
                              : 'border-white/[0.06] bg-[#0D1525] hover:border-white/[0.12] hover:bg-[#111927]'
                          }`}>
                          <CircleDot className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2">
                              <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors leading-snug flex-1">{issue.title}</span>
                              <span className="text-[10px] text-gray-700 shrink-0">#{issue.number}</span>
                            </div>
                            {issue.labels?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {issue.labels.map((label: { name: string; color: string }) => (
                                  <span key={label.name} className="px-1.5 py-0.5 text-[10px] font-medium rounded-full" style={getLabelColors(label.color)}>
                                    {label.name}
                                  </span>
                                ))}
                              </div>
                            )}
                            <p className="text-[10px] text-gray-700 mt-1.5">
                              Opened {formatRelativeDate(issue.createdAt)} · {issue.commentsCount} comments
                            </p>
                          </div>
                          <a href={issue.url} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-gray-700 hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-all shrink-0 mt-0.5">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      );
                    })}
                    {hasNextIssues && (
                      <div className="flex justify-center pt-3">
                        <button onClick={() => fetchNextIssues()} disabled={isFetchingNextIssues}
                          className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs text-gray-400 border border-white/[0.08] hover:border-white/[0.15] hover:text-white disabled:opacity-40 transition-all cursor-pointer">
                          {isFetchingNextIssues ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Loading…</> : 'Load more issues'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Pull Requests */}
            {activeTab === 'pullrequests' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-gray-600">{currentTotalCount} {prState} pull requests</p>
                  <div className="flex items-center rounded-lg bg-white/[0.04] border border-white/[0.08] p-0.5">
                    {(['open', 'closed'] as const).map(s => (
                      <button key={s} onClick={() => { if (prState !== s) { setIsSwitching(true); setPrState(s); } }}
                        disabled={prState === s || isSwitching}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                          prState === s ? 'bg-[#0D1525] text-white border border-white/[0.08] shadow-sm' : 'text-gray-500 hover:text-gray-300'
                        }`}>
                        {s === 'open' ? `Open (${prCounts?.open ?? 0})` : `Closed (${prCounts?.closed ?? 0})`}
                      </button>
                    ))}
                  </div>
                </div>

                {isSwitching || (prsLoading && allPullRequests.length === 0) ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <div key={i} className="animate-pulse h-20 rounded-xl bg-[#0D1525] border border-white/[0.05]" />)}
                  </div>
                ) : allPullRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <GitPullRequest className="w-8 h-8 text-gray-700 mb-3" />
                    <p className="text-sm text-gray-500">No {prState} pull requests found</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {allPullRequests.map(pr => (
                      <div key={pr.id} className="group flex flex-col gap-3 px-4 py-4 rounded-xl bg-[#0D1525] border border-white/[0.06] hover:border-white/[0.12] hover:bg-[#111927] transition-all">
                        <div className="flex items-start gap-3">
                          <img src={pr.user.avatar_url} alt={pr.user.login} width={24} height={24}
                            loading="lazy" decoding="async" className="w-6 h-6 rounded-full shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2">
                              <button onClick={() => handleViewPullRequest(pr.number)} onMouseEnter={() => prefetchPRDetails(pr)}
                                className="flex-1 text-sm font-medium text-gray-200 hover:text-white text-left leading-snug cursor-pointer transition-colors">
                                {pr.title}
                              </button>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {pr.draft && <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-white/[0.06] border border-white/[0.08] text-gray-500">Draft</span>}
                                <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full border ${
                                  pr.merged_at ? 'text-violet-400 bg-violet-500/10 border-violet-500/20'
                                  : pr.state === 'open' ? 'text-green-400 bg-green-500/10 border-green-500/20'
                                  : 'text-gray-400 bg-white/[0.05] border-white/[0.08]'
                                }`}>
                                  {pr.merged_at ? 'Merged' : pr.state}
                                </span>
                              </div>
                            </div>
                            <p className="text-[10px] text-gray-700 mt-0.5">
                              #{pr.number} · {pr.user.login} · {formatRelativeDate(pr.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-9">
                          {[
                            { icon: GitCommit, val: pr.commits || 0, label: 'commits' },
                            { icon: FileText, val: pr.changed_files || 0, label: 'files' },
                          ].map(({ icon: Icon, val, label }) => (
                            <span key={label} className="flex items-center gap-1 text-[11px] text-gray-600">
                              <Icon className="w-3 h-3" />{val.toLocaleString()} {label}
                            </span>
                          ))}
                          <span className="flex items-center gap-1 text-[11px] text-green-600">
                            <Plus className="w-3 h-3" />{(pr.additions || 0).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-red-700">
                            <Minus className="w-3 h-3" />{(pr.deletions || 0).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-gray-600">
                            <MessageSquare className="w-3 h-3" />{((pr.comments || 0) + (pr.review_comments || 0)).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-mono text-gray-700">
                            {pr.base.ref} ← {pr.head.ref}
                          </span>
                        </div>

                        {pr.labels?.length > 0 && (
                          <div className="flex flex-wrap gap-1 pl-9">
                            {pr.labels.map((label: { name: string; color: string }) => (
                              <span key={label.name} className="px-1.5 py-0.5 text-[10px] font-medium rounded-full" style={getLabelColors(label.color)}>
                                {label.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {pr.requested_reviewers?.length > 0 && (
                          <div className="flex items-center gap-2 pl-9">
                            <span className="text-[10px] text-gray-700">Reviewers:</span>
                            <div className="flex -space-x-1.5">
                              {pr.requested_reviewers.map((r: { login: string; avatar_url: string }) => (
                                <img key={r.login} src={r.avatar_url} alt={r.login} title={r.login}
                                  width={20} height={20} loading="lazy" decoding="async"
                                  className="w-5 h-5 rounded-full ring-1 ring-[#0D1525]" />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {hasNextPrs && (
                      <div className="flex justify-center pt-3">
                        <button onClick={() => fetchNextPrs()} disabled={isFetchingNextPrs}
                          className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs text-gray-400 border border-white/[0.08] hover:border-white/[0.15] hover:text-white disabled:opacity-40 transition-all cursor-pointer">
                          {isFetchingNextPrs ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Loading…</> : `Load more (${allPullRequests.length} of ${currentTotalCount})`}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-64 shrink-0 pr-6 pt-0 pb-8 space-y-4">

            {/* About */}
            <div className="rounded-xl bg-[#0D1525] border border-white/[0.07] p-4">
              <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-widest mb-3">About</p>
              {repository.description && <p className="text-xs text-gray-500 leading-relaxed mb-3">{repository.description}</p>}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Star className="w-3.5 h-3.5 text-amber-500/70" />
                  {repository.stargazers_count.toLocaleString()} stars
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <GitFork className="w-3.5 h-3.5" />{repository.forks_count.toLocaleString()} forks
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Eye className="w-3.5 h-3.5" />{repository.watchers_count.toLocaleString()} watchers
                </div>
                {repository.license && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Scale className="w-3.5 h-3.5" />{repository.license.name}
                  </div>
                )}
              </div>
            </div>

            {/* Top Contributors */}
            {topContributors && topContributors.length > 0 && (
              <div className="rounded-xl bg-[#0D1525] border border-white/[0.07] p-4">
                <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-widest mb-3">Top Contributors</p>
                <div className="space-y-2">
                  {topContributors.map(c => (
                    <div key={c.login} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors">
                      <img src={c.avatar_url} alt={c.login} width={28} height={28} loading="lazy" decoding="async"
                        className="w-7 h-7 rounded-full shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-300 truncate">{c.login}</p>
                        <p className="text-[10px] text-gray-700">{c.contributions} commits</p>
                      </div>
                      <span className="text-[10px] text-gray-600 shrink-0">{c.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <PullRequestDetailsModal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} pullRequestDetails={prDetails} isLoading={isLoadingDetails} />
      <IssueDetailsModal isOpen={isCommentsModalOpen} onClose={() => { handleCloseComments(); setSelectedIssue(null); }} issue={selectedIssue} comments={allComments} isLoadingComments={isLoadingComments} hasMoreComments={hasMoreComments} isLoadingMore={isLoadingMore} onLoadMore={onLoadMore} onAddComment={handleAddComment} owner={owner} repo={repo} repoLanguage={repository.language} repoDescription={repository.description} />
    </div>
  );
};

export default RepositoryDetails;
