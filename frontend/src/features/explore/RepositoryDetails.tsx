import { useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQuery, useInfiniteQuery, useQueryClient, keepPreviousData, useMutation } from '@tanstack/react-query';
import { GitFork, GitPullRequest, MessageSquare, GitCommit, Plus, Minus, FileText, CircleDot, ExternalLink, BookOpen, ChevronDown, ChevronUp, Sparkles, Star, Users, ShieldCheck, TrendingUp } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatRelativeDate } from '../../utils/formatDate';
import { motion } from 'framer-motion';
import { getRepositoryDetails, getTopContributors, getLotteryContributors, getContributorConfidence, getRepositoryPullRequests, getPullRequestDetails, getRepositoryIssues, onboardRepo, checkRepoStarred, starRepo, unstarRepo } from '../../services/github';
import ReactMarkdown from 'react-markdown';
import { getLabelColors } from '../dashboard/utils/filterUtils';
import PullRequestDetailsModal, { PullRequestDetails } from '../../components/PullRequestDetailsModal';
import IssueDetailsModal from '../../components/IssueDetailsModal';
import useIssueComments from '../../hooks/useIssueComments';
import { useState, useEffect, useRef, useMemo } from 'react';
import { RepositorySkeleton } from '../../components/skeletons';
interface Repository {
  id: number;
  full_name: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  language: string;
  html_url: string;
  default_branch: string;
  open_issues_count: number;
  topics: string[];
  updated_at: string;
  license: {
    name: string;
  } | null;
  owner: {
    avatar_url: string;
    login: string;
  };
}
interface TopContributor {
  login: string;
  avatar_url: string;
  contributions: number;
  percentage: number;
}
interface LotteryContributor {
  login: string;
  avatar_url: string;
  pull_requests: number;
  percentage: number;
}
interface ContributorConfidence {
  percentage: number;
  message: string;
}
interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  draft: boolean;
  user: {
    login: string;
    avatar_url: string;
  };
  labels: Array<{
    name: string;
    color: string;
  }>;
  requested_reviewers: Array<{
    login: string;
    avatar_url: string;
  }>;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
  };
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
  comments: number;
  review_comments: number;
}
type PullRequestsResult = {
  pullRequests: PullRequest[];
  hasMore: boolean;
  totalCount: number;
};
interface PullRequestCounts {
  open: number;
  closed: number;
}
const RepositoryDetails = () => {
  const {
    owner,
    repo
  } = useParams();
  const [searchParams] = useSearchParams();
  const focusedIssueNumber = searchParams.get('issue') ? Number(searchParams.get('issue')) : null;
  const issuesSectionRef = useRef<HTMLDivElement>(null);
  const focusedIssueRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  usePageTitle(`${owner}/${repo}`);
  const {
    data: repository,
    isLoading: repoLoading
  } = useQuery<Repository>({
    queryKey: ['repository', owner, repo],
    queryFn: () => getRepositoryDetails(owner!, repo!),
    enabled: !!owner && !!repo,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000
  });
  const {
    data: topContributors
  } = useQuery<TopContributor[]>({
    queryKey: ['top-contributors', owner, repo],
    queryFn: () => getTopContributors(owner!, repo!),
    enabled: !!owner && !!repo,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000
  });
  const {
    data: lotteryContributors
  } = useQuery<LotteryContributor[]>({
    queryKey: ['lottery-contributors', owner, repo],
    queryFn: () => getLotteryContributors(owner!, repo!),
    enabled: !!owner && !!repo,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000
  });
  const {
    data: contributorConfidence
  } = useQuery<ContributorConfidence>({
    queryKey: ['contributor-confidence', owner, repo],
    queryFn: () => getContributorConfidence(owner!, repo!),
    enabled: !!owner && !!repo,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000
  });
  const {
    data: issuesData,
    isLoading: issuesLoading,
    fetchNextPage: fetchNextIssues,
    hasNextPage: hasNextIssues,
    isFetchingNextPage: isFetchingNextIssues
  } = useInfiniteQuery({
    queryKey: ['repo-issues', owner, repo],
    queryFn: ({ pageParam = 1 }) => getRepositoryIssues(owner!, repo!, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => lastPage.hasMore ? allPages.length + 1 : undefined,
    enabled: !!owner && !!repo,
    staleTime: 2 * 60 * 1000
  });
  const allIssues = useMemo(() => issuesData?.pages.flatMap(p => p.issues) ?? [], [issuesData]);

  useEffect(() => {
    if (focusedIssueNumber && focusedIssueRef.current) {
      focusedIssueRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusedIssueNumber, allIssues]);

  const [selectedIssue, setSelectedIssue] = useState<(typeof allIssues)[0] | null>(null);
  const {
    isCommentsModalOpen,
    allComments,
    isLoadingComments,
    hasMoreComments,
    isLoadingMore,
    onLoadMore,
    handleViewComments,
    handleCloseComments,
    handleAddComment
  } = useIssueComments();

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
    enabled: !!owner && !!repo,
    staleTime: 5 * 60 * 1000,
  });

  const starMutation = useMutation({
    mutationFn: (target: boolean) => target ? starRepo(owner!, repo!) : unstarRepo(owner!, repo!),
    onSuccess: (_, target) => {
      queryClient.setQueryData(['repo-starred', owner, repo], target);
      if (!target) {
        // Remove repo from the starred-repos infinite cache immediately
        type StarredPage = { repos: { full_name: string }[]; hasMore: boolean };
        queryClient.setQueryData<{ pages: StarredPage[]; pageParams: unknown[] }>(
          ['starred-repos'],
          old => old ? {
            ...old,
            pages: old.pages.map(p => ({
              ...p,
              repos: p.repos.filter(r => r.full_name !== `${owner}/${repo}`),
            })),
          } : old
        );
      } else {
        queryClient.invalidateQueries({ queryKey: ['starred-repos'] });
      }
      toast.success(target ? 'Repository starred' : 'Repository unstarred');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } }; message?: string })
        ?.response?.data?.error ?? (err as { message?: string })?.message ?? 'Unknown error';
      toast.error(`Failed: ${msg}`);
    },
  });

  const handleOnboard = () => {
    if (!owner || !repo) return;
    setOnboarding('');
    setOnboardingError(null);
    setIsOnboarding(true);
    setShowOnboarding(true);
    onboardRepo({
      owner,
      repo,
      onChunk: text => setOnboarding(prev => prev + text),
      onDone: () => setIsOnboarding(false),
      onError: err => { setOnboardingError(err); setIsOnboarding(false); },
    });
  };
  
  const {
    data: pullRequestsData,
    isLoading: prsLoading,
    fetchNextPage: fetchNextPrs,
    hasNextPage: hasNextPrs,
    isFetchingNextPage: isFetchingNextPrs
  } = useInfiniteQuery({
    queryKey: ['pull-requests', owner, repo, prState],
    queryFn: ({ pageParam = 1 }) => getRepositoryPullRequests(owner!, repo!, prState, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => lastPage.hasMore ? allPages.length + 1 : undefined,
    enabled: !!owner && !!repo,
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000
  });

  const allPullRequests = useMemo(() => pullRequestsData?.pages.flatMap(page => page.pullRequests) ?? [], [pullRequestsData]);
  const currentTotalCount = pullRequestsData?.pages[0]?.totalCount || 0;

  useEffect(() => {
    setIsSwitching(false);
  }, [prState]);

  const {
    data: prCounts
  } = useQuery<PullRequestCounts>({
    queryKey: ['pull-request-counts', owner, repo],
    queryFn: async () => {
      const openData = queryClient.getQueryData(['pull-requests', owner, repo, 'open']) as { pages: PullRequestsResult[] } | undefined;
      const closedData = queryClient.getQueryData(['pull-requests', owner, repo, 'closed']) as { pages: PullRequestsResult[] } | undefined;
      if (openData && closedData) {
        return {
          open: openData.pages[0]?.totalCount || 0,
          closed: closedData.pages[0]?.totalCount || 0
        };
      }
      const [newOpenData, newClosedData] = await Promise.all([getRepositoryPullRequests(owner!, repo!, 'open', 1), getRepositoryPullRequests(owner!, repo!, 'closed', 1)]);
      return {
        open: newOpenData.totalCount,
        closed: newClosedData.totalCount
      };
    },
    enabled: !!owner && !!repo,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000
  });
  const prefetchPRDetails = (pr: PullRequest) => {
    queryClient.prefetchQuery({
      queryKey: ['pr-details', owner, repo, pr.number],
      queryFn: () => getPullRequestDetails(owner!, repo!, pr.number),
      staleTime: 5 * 60 * 1000
    });
  };
  const handleOpenClick = () => {
    if (prState !== 'open') {
      setIsSwitching(true);
      setPrState('open');
    }
  };
  const handleClosedClick = () => {
    if (prState !== 'closed') {
      setIsSwitching(true);
      setPrState('closed');
    }
  };
  const handleLoadMore = () => {
    fetchNextPrs();
  };
  const handleViewPullRequest = async (prNumber: number) => {
    try {
      setIsLoadingDetails(true);
      const details = await getPullRequestDetails(owner!, repo!, prNumber);
      if (!details || typeof details === 'string') {
        throw new Error('Invalid pull request details received');
      }
      setPrDetails(details);
      setIsDetailsModalOpen(true);
    } catch (error) {
      console.error('Error fetching PR details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };
  if (repoLoading) return <RepositorySkeleton />;
  if (!repository) return null;
  if (!owner || !repo) return null;
  return <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-12">
      {}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <img src={repository.owner.avatar_url} alt="" width={64} height={64} loading="lazy" decoding="async" className="w-16 h-16 rounded" />
          <div>
            <a href={repository.html_url} target="_blank" rel="noopener noreferrer" className="text-2xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {repository.full_name}
            </a>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Last updated {formatRelativeDate(repository.updated_at)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => starMutation.mutate(!isStarred)}
            disabled={starredLoading || starMutation.isPending}
            title={isStarred ? 'Unstar this repository on GitHub' : 'Star this repository on GitHub'}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${
              isStarred
                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40 border-amber-200 dark:border-amber-800/50'
                : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700'
            }`}
          >
            <Star className={`w-4 h-4 ${isStarred ? 'fill-amber-500 text-amber-500' : ''}`} />
            {isStarred ? 'Starred' : 'Star'}
          </button>
          <button
            onClick={handleOnboard}
            disabled={isOnboarding}
            title="Generate AI onboarding guide for this repo"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800/50 disabled:opacity-50 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            {isOnboarding ? 'Generating…' : 'Onboarding Guide'}
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Onboarding panel */}
      {showOnboarding && (
        <div className="mb-8 rounded-xl border border-indigo-200 dark:border-indigo-800/50 overflow-hidden">
          <button
            onClick={() => setShowOnboarding(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3 bg-indigo-50 dark:bg-indigo-900/20 text-sm font-semibold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
          >
            <span className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              AI Onboarding Guide — {repository.full_name}
            </span>
            <span className="flex items-center gap-2">
              {isOnboarding && <span className="text-xs text-indigo-500 dark:text-indigo-400 animate-pulse">Generating…</span>}
              {showOnboarding ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </button>
          <div className="px-6 py-5 bg-white dark:bg-gray-900/50">
            {onboardingError ? (
              <p className="text-sm text-red-500 dark:text-red-400">{onboardingError}</p>
            ) : onboarding ? (
              <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                <ReactMarkdown>{onboarding}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex items-center gap-3 py-4 text-sm text-gray-400">
                <LoadingSpinner />
                <span>Reading README, CONTRIBUTING.md, recent PRs…</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {}
        <div className="lg:col-span-2 space-y-6">
          {}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.5
        }} className="space-y-8">
            {}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {}
              <motion.div whileHover={{ scale: 1.02 }} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-base font-medium text-gray-900 dark:text-white">
                    Contributor Confidence
                  </h3>
                  {(() => {
                    const pct = contributorConfidence?.percentage || 0;
                    const tier = pct >= 75 ? { label: 'Strong', cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' }
                      : pct >= 50 ? { label: 'Good', cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' }
                      : pct >= 25 ? { label: 'Moderate', cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' }
                      : { label: 'Low', cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' };
                    return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tier.cls}`}>{tier.label}</span>;
                  })()}
                </div>

                {/* Donut chart */}
                <div className="flex items-center justify-center my-2">
                  <div className="relative w-28 h-28">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <path d="M 50,50 m 0,-40 a 40,40 0 1 1 0,80 a 40,40 0 1 1 0,-80" fill="none" stroke="#E5E7EB" strokeWidth="8" className="dark:stroke-gray-700" />
                      <path d="M 50,50 m 0,-40 a 40,40 0 1 1 0,80 a 40,40 0 1 1 0,-80" fill="none"
                        stroke={
                          (contributorConfidence?.percentage || 0) >= 75 ? '#22c55e'
                          : (contributorConfidence?.percentage || 0) >= 50 ? '#3b82f6'
                          : (contributorConfidence?.percentage || 0) >= 25 ? '#f59e0b'
                          : '#ef4444'
                        }
                        strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={`${(contributorConfidence?.percentage || 0) * 2.51} 251.2`} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-gray-900 dark:text-white leading-none">
                        {contributorConfidence?.percentage || 0}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Message */}
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
                  {contributorConfidence?.message}
                </p>

                {/* Stat pills */}
                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center gap-1">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {topContributors?.length ?? '—'}
                    </span>
                    <span className="text-[10px] text-gray-400 text-center leading-tight">Top contributors</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {topContributors?.[0] ? `${topContributors[0].percentage}%` : '—'}
                    </span>
                    <span className="text-[10px] text-gray-400 text-center leading-tight">Top share</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {lotteryContributors?.length ?? '—'}
                    </span>
                    <span className="text-[10px] text-gray-400 text-center leading-tight">Core authors</span>
                  </div>
                </div>
              </motion.div>

              {}
              <motion.div whileHover={{
              scale: 1.02
            }} className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 p-6 rounded-xl border border-green-100 dark:border-green-900">
                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-6">
                  OpenSSF Score
                </h3>

                {}
                <div className="mb-4">
                  <svg className="w-full h-16" viewBox="0 0 400 64" preserveAspectRatio="xMidYMid meet">
                    <line x1="40" y1="28" x2="360" y2="28" stroke="#E5E7EB" strokeWidth="2" />
                    {[0, 2.5, 5, 7.5, 10].map((score, index) => <g key={score}>
                        <line x1={40 + index * 80} y1="20" x2={40 + index * 80} y2="36" stroke="#E5E7EB" strokeWidth="2" />
                        <text x={40 + index * 80} y="54" textAnchor="middle" fontSize="13" className="fill-gray-500">
                          {score}
                        </text>
                      </g>)}
                    <circle cx={40 + 5.4 / 10 * 320} cy="28" r="6" fill="#059669" stroke="#FFFFFF" strokeWidth="2.5" />
                  </svg>
                </div>

                {}
                <div className="flex justify-center mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-medium text-gray-900 dark:text-white">5.4</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">/ 10</span>
                  </div>
                </div>

                {}
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    The OpenSSF Scorecard evaluates this repository's security practices and maintenance.
                  </p>
                  <div className="space-y-2">
                    {}
                    <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"></div>
                        <span>0-3: High Risk</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shrink-0"></div>
                        <span>4-7: Medium</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0"></div>
                        <span>8-10: Low Risk</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Score based on automated analysis of security best practices.
                      <a href="https://securityscorecards.dev" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 ml-1">
                        Learn more
                      </a>
                    </p>
                  </div>
                </div>
              </motion.div>

              {}
              {(() => {
                const contributors = lotteryContributors ?? [];
                const topPct = contributors[0]?.percentage ?? 0;
                const risk = topPct >= 80 ? { label: 'High', border: 'border-red-300 dark:border-red-800', bg: 'from-red-500/10 to-orange-500/10', badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400', tip: 'One person leaving would stall most activity.' }
                  : topPct >= 50 ? { label: 'Medium', border: 'border-orange-300 dark:border-orange-800', bg: 'from-orange-500/10 to-amber-500/10', badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400', tip: 'A few departures could significantly slow the project.' }
                  : { label: 'Low', border: 'border-green-200 dark:border-green-800', bg: 'from-green-500/5 to-emerald-500/5', badge: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', tip: 'Contributions are spread across many people.' };
                const COLORS = ['#3b82f6','#8b5cf6','#f59e0b','#10b981','#ef4444'];
                const totalPct = contributors.reduce((s, c) => s + c.percentage, 0);
                const restPct = Math.max(0, 100 - totalPct);
                return (
                  <motion.div whileHover={{ scale: 1.02 }} className={`bg-gradient-to-br ${risk.bg} p-6 rounded-xl border ${risk.border} flex flex-col`}>
                    {/* Header */}
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Lottery Factor</h3>
                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${risk.badge}`}>{risk.label}</span>
                    </div>

                    {/* Concentration bar */}
                    {contributors.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">PR concentration (last 30 days)</p>
                        <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
                          {contributors.map((c, i) => (
                            <div key={c.login} title={`${c.login}: ${c.percentage}%`}
                              style={{ width: `${c.percentage}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                          ))}
                          {restPct > 0 && <div style={{ width: `${restPct}%` }} className="bg-gray-200 dark:bg-gray-700" />}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                          {contributors.map((c, i) => (
                            <span key={c.login} className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                              {c.login} {c.percentage}%
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Contributors list */}
                    <div className="space-y-2.5 flex-1">
                      {contributors.map((contributor, i) => (
                        <div key={contributor.login} className="flex items-center gap-3">
                          <img src={contributor.avatar_url} alt="" width={28} height={28} loading="lazy" decoding="async" className="w-7 h-7 rounded-full shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{contributor.login}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 ml-2">{contributor.pull_requests} PRs · {contributor.percentage}%</span>
                            </div>
                            <div className="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${contributor.percentage}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                            </div>
                          </div>
                        </div>
                      ))}
                      {contributors.length === 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No recent PR data available.</p>
                      )}
                    </div>

                    {/* Risk insight */}
                    <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5">
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        <span className={`font-semibold ${risk.badge.includes('red') ? 'text-red-600 dark:text-red-400' : risk.badge.includes('amber') ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>{risk.label} bus factor. </span>
                        {risk.tip}
                      </p>
                    </div>
                  </motion.div>
                );
              })()}
            </div>
          </motion.div>
        </div>

        {}
        <div className="space-y-6">
          {}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">About</h3>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">{repository.description}</p>
              <div className="flex items-center gap-2">
                <GitFork className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {repository.forks_count.toLocaleString()} forks
                </span>
              </div>
              {repository.license && <div className="text-sm text-gray-600 dark:text-gray-400">
                  License: {repository.license.name}
                </div>}
            </div>
          </div>

          {topContributors && topContributors.length > 0 && (
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.5,
          delay: 0.3
        }} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
              Top Contributors
            </h3>
            <div className="space-y-4">
              {topContributors.map(contributor => <div key={contributor.login} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <img src={contributor.avatar_url} alt={`${contributor.login}'s avatar`} width={32} height={32} loading="lazy" decoding="async" className="w-8 h-8 rounded-full" />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {contributor.login}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {contributor.contributions} contributions
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {contributor.percentage}%
                  </span>
                </div>)}
              {topContributors.length > 5 && <button className="w-full py-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                  View all {topContributors.length} contributors
                </button>}
            </div>
          </motion.div>
          )}
        </div>
      </div>

      {}
      <div className="mt-8">
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-6 w-fit">
          <button
            onClick={() => setActiveTab('issues')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'issues'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <CircleDot className="w-4 h-4 text-green-500" />
            Issues
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {issuesData?.pages[0]?.totalCount ?? 0}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('pullrequests')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'pullrequests'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <GitPullRequest className="w-4 h-4 text-blue-500" />
            Pull Requests
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {currentTotalCount}
            </span>
          </button>
        </div>

        {activeTab === 'issues' ? (
          <div ref={issuesSectionRef}>
            {issuesLoading ? (
              <div className="flex justify-center py-8"><LoadingSpinner /></div>
            ) : allIssues.length === 0 ? (
              <div className="text-center text-gray-600 dark:text-gray-400 py-8">No open issues found</div>
            ) : (
              <div className="space-y-3">
                {allIssues.map(issue => {
                  const isFocused = issue.number === focusedIssueNumber;
                  return (
                    <div
                      key={issue.id}
                      ref={isFocused ? focusedIssueRef : undefined}
                      onClick={() => { setSelectedIssue(issue); handleViewComments(issue); }}
                      className={`p-4 rounded-lg border cursor-pointer transition-all duration-500 ${isFocused
                        ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500 ring-2 ring-blue-400/40'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {issue.title}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">#{issue.number}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {issue.labels.map(label => (
                              <span key={label.name} className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full" style={getLabelColors(label.color)}>
                                {label.name}
                              </span>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Opened {formatRelativeDate(issue.createdAt)} · {issue.commentsCount} comments
                          </p>
                        </div>
                        <a href={issue.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  );
                })}
                {hasNextIssues && (
                  <div className="flex justify-center pt-4">
                    <button onClick={() => fetchNextIssues()} disabled={isFetchingNextIssues} className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
                      {isFetchingNextIssues ? 'Loading...' : 'Load more issues'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {currentTotalCount} {prState} pull requests
              </p>
              <div className="flex gap-2">
                <button onClick={handleOpenClick} disabled={prState === 'open' || isSwitching} className={`px-3 py-1 rounded-md text-sm ${prState === 'open' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}>
                  Open ({prCounts?.open || 0})
                </button>
                <button onClick={handleClosedClick} disabled={prState === 'closed' || isSwitching} className={`px-3 py-1 rounded-md text-sm ${prState === 'closed' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}>
                  Closed ({prCounts?.closed || 0})
                </button>
              </div>
            </div>

            {isSwitching || (prsLoading && allPullRequests.length === 0) ? (
              <div className="flex justify-center py-8"><LoadingSpinner /></div>
            ) : allPullRequests.length === 0 ? (
              <div className="text-center text-gray-600 dark:text-gray-400 py-8">
                No {prState} pull requests found
              </div>
            ) : (
              <div className="space-y-4">
                {allPullRequests?.map(pr => <motion.div key={pr.id} initial={{
                opacity: 0,
                y: 20
              }} animate={{
                opacity: 1,
                y: 0
              }} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 border border-gray-200 dark:border-gray-700">
                    {/* */}
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex items-start space-x-3">
                        <img src={pr.user.avatar_url} alt={pr.user.login} width={40} height={40} loading="lazy" decoding="async" className="w-8 h-8 md:w-10 md:h-10 rounded-full flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <h3 onClick={() => handleViewPullRequest(pr.number)} onMouseEnter={() => prefetchPRDetails(pr)} className="text-base md:text-lg font-medium text-gray-900 dark:text-white truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400">
                            {pr.title}
                          </h3>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs md:text-sm text-gray-500">
                            <span>#{pr.number}</span>
                            <span>•</span>
                            <span>{pr.user.login}</span>
                            <span>•</span>
                            <span>{formatRelativeDate(pr.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {pr.draft && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            Draft
                          </span>}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pr.state === 'open' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                          {pr.merged_at ? 'Merged' : pr.state}
                        </span>
                      </div>
                    </div>

                    {/* */}
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs md:text-sm">
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1 text-gray-500">
                          <GitCommit className="w-3.5 h-3.5" />
                          <span className="md:hidden">Commits:</span>
                        </div>
                        <span className="text-gray-600 dark:text-gray-400">
                          {(pr.commits || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1 text-gray-500">
                          <FileText className="w-3.5 h-3.5" />
                          <span className="md:hidden">Files:</span>
                        </div>
                        <span className="text-gray-600 dark:text-gray-400">
                          {(pr.changed_files || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1 text-gray-500">
                          <Plus className="w-3.5 h-3.5 text-green-500" />
                          <span className="md:hidden">Added:</span>
                        </div>
                        <span className="text-gray-600 dark:text-gray-400">
                          {(pr.additions || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1 text-gray-500">
                          <Minus className="w-3.5 h-3.5 text-red-500" />
                          <span className="md:hidden">Removed:</span>
                        </div>
                        <span className="text-gray-600 dark:text-gray-400">
                          {(pr.deletions || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* */}
                    {pr.labels.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">
                        {pr.labels.map((label: any) => {
                          return <span key={label.name} className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap" style={getLabelColors(label.color)}>
                              {label.name}
                            </span>;
                        })}
                      </div>}

                    {/* */}
                    {pr.requested_reviewers.length > 0 && <div className="mt-3">
                        <div className="text-xs md:text-sm text-gray-500 mb-1.5">Reviewers</div>
                        <div className="flex -space-x-2">
                          {pr.requested_reviewers.map((reviewer: any) => <img key={reviewer.login} src={reviewer.avatar_url} alt={reviewer.login} title={reviewer.login} width={32} height={32} loading="lazy" decoding="async" className="w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-white dark:border-gray-800" />)}
                        </div>
                      </div>}

                    {/* */}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs md:text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <MessageSquare className="w-4 h-4" />
                        <span>
                          {((pr.comments || 0) + (pr.review_comments || 0)).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1">
                          <GitPullRequest className="w-4 h-4 flex-shrink-0" />
                          <span className="md:hidden">Branch changes:</span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0 font-mono text-xs">
                          <span className="truncate text-gray-600 dark:text-gray-400" title={pr.base.ref}>
                            {pr.base.ref}
                          </span>
                          <span className="text-gray-400">←</span>
                          <span className="truncate text-gray-600 dark:text-gray-400" title={pr.head.ref}>
                            {pr.head.ref}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>)}

                {hasNextPrs && <div className="flex justify-center mt-4 md:mt-6">
                    <button onClick={handleLoadMore} disabled={isFetchingNextPrs} className="w-full md:w-auto px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors text-sm md:text-base font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                      {isFetchingNextPrs ? 'Loading...' : `Load More (${allPullRequests.length} of ${currentTotalCount})`}
                    </button>
                  </div>}

                {!hasNextPrs && allPullRequests.length > 0 && <div className="text-center text-gray-600 dark:text-gray-400 py-4 md:py-8">
                    Showing {allPullRequests.length} of {currentTotalCount} pull requests
                  </div>}
              </div>
            )}
          </div>
        )}
      </div>

      <PullRequestDetailsModal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} pullRequestDetails={prDetails} isLoading={isLoadingDetails} />
      <IssueDetailsModal isOpen={isCommentsModalOpen} onClose={() => { handleCloseComments(); setSelectedIssue(null); }} issue={selectedIssue} comments={allComments} isLoadingComments={isLoadingComments} hasMoreComments={hasMoreComments} isLoadingMore={isLoadingMore} onLoadMore={onLoadMore} onAddComment={handleAddComment} owner={owner} repo={repo} repoLanguage={repository.language} repoDescription={repository.description} />
    </div>;
};
export default RepositoryDetails;