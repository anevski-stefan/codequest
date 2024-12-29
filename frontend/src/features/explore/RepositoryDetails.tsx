import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import { GitFork, GitPullRequest, MessageSquare, GitCommit, Plus, Minus, FileText } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { motion } from 'framer-motion';
import { getRepositoryDetails, getTopContributors, getLotteryContributors, getContributorConfidence, getRepositoryPullRequests, getPullRequestDetails } from '../../services/github';
import PullRequestDetailsModal, { PullRequestDetails } from '../../components/PullRequestDetailsModal';
import { useState } from 'react';

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

interface PullRequestCounts {
  open: number;
  closed: number;
}

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const RepositoryDetails = () => {
  const { owner, repo } = useParams();
  const queryClient = useQueryClient();
  usePageTitle(`${owner}/${repo}`);

  const { data: repository, isLoading: repoLoading } = useQuery<Repository>(
    ['repository', owner, repo],
    () => getRepositoryDetails(owner!, repo!),
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 30 * 60 * 1000,
    }
  );

  const { data: topContributors } = useQuery<TopContributor[]>(
    ['top-contributors', owner, repo],
    () => getTopContributors(owner!, repo!),
    {
      staleTime: 15 * 60 * 1000,
      cacheTime: 60 * 60 * 1000,
    }
  );

  const { data: lotteryContributors } = useQuery<LotteryContributor[]>(
    ['lottery-contributors', owner, repo],
    () => getLotteryContributors(owner!, repo!),
    {
      staleTime: 15 * 60 * 1000,
      cacheTime: 60 * 60 * 1000,
    }
  );

  const { data: contributorConfidence } = useQuery<ContributorConfidence>(
    ['contributor-confidence', owner, repo],
    () => getContributorConfidence(owner!, repo!),
    {
      staleTime: 15 * 60 * 1000,
      cacheTime: 60 * 60 * 1000,
    }
  );

  const [allPullRequests, setAllPullRequests] = useState<PullRequest[]>([]);
  const [page, setPage] = useState(1);
  const [prState, setPrState] = useState<'open' | 'closed'>('open');
  const [isSwitching, setIsSwitching] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [prDetails, setPrDetails] = useState<PullRequestDetails | undefined>(undefined);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const { data: pullRequestsData, isLoading: prsLoading } = useQuery<{
    pullRequests: PullRequest[];
    hasMore: boolean;
    totalCount: number;
  }>(
    ['pull-requests', owner, repo, prState, page],
    () => getRepositoryPullRequests(owner!, repo!, prState, page),
    {
      enabled: !!owner && !!repo,
      keepPreviousData: true,
      staleTime: 2 * 60 * 1000,
      onSuccess: (newData) => {
        if (newData.hasMore) {
          queryClient.prefetchQuery(
            ['pull-requests', owner, repo, prState, page + 1],
            () => getRepositoryPullRequests(owner!, repo!, prState, page + 1)
          );
        }
        
        if (page === 1) {
          setAllPullRequests(newData.pullRequests);
        } else {
          setAllPullRequests(prev => {
            const existingIds = new Set(prev.map(pr => pr.id));
            const newUniquePRs = newData.pullRequests.filter(
              pr => !existingIds.has(pr.id)
            );
            return [...prev, ...newUniquePRs];
          });
        }
        setIsSwitching(false);
      }
    }
  );

  const { data: prCounts } = useQuery<PullRequestCounts>(
    ['pull-request-counts', owner, repo],
    async () => {
      const openData = queryClient.getQueryData(['pull-requests', owner, repo, 'open', 1]) as any;
      const closedData = queryClient.getQueryData(['pull-requests', owner, repo, 'closed', 1]) as any;

      if (openData && closedData) {
        return {
          open: openData.totalCount,
          closed: closedData.totalCount
        };
      }

      const [newOpenData, newClosedData] = await Promise.all([
        getRepositoryPullRequests(owner!, repo!, 'open', 1),
        getRepositoryPullRequests(owner!, repo!, 'closed', 1)
      ]);
      return {
        open: newOpenData.totalCount,
        closed: newClosedData.totalCount
      };
    },
    {
      enabled: !!owner && !!repo,
      staleTime: 5 * 60 * 1000,
      cacheTime: 30 * 60 * 1000,
    }
  );

  const prefetchPRDetails = (pr: PullRequest) => {
    queryClient.prefetchQuery(
      ['pr-details', owner, repo, pr.number],
      () => getPullRequestDetails(owner!, repo!, pr.number),
      {
        staleTime: 5 * 60 * 1000,
      }
    );
  };

  const handleOpenClick = () => {
    if (prState !== 'open') {
      setIsSwitching(true);
      setPrState('open');
      setPage(1);
    }
  };

  const handleClosedClick = () => {
    if (prState !== 'closed') {
      setIsSwitching(true);
      setPrState('closed');
      setPage(1);
    }
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
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
      // Optionally show an error toast/notification here
    } finally {
      setIsLoadingDetails(false);
    }
  };

  if (repoLoading) return <LoadingSpinner />;
  if (!repository) return null;

  return (
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <img src={repository.owner.avatar_url} alt="" className="w-16 h-16 rounded" />
        <div>
          <a 
            href={repository.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-2xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {repository.full_name}
          </a>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Last updated {formatDistanceToNow(new Date(repository.updated_at), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metrics Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            {/* Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Contributor Confidence */}
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700"
              >
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-base font-medium text-gray-900 dark:text-white">
                    Contributor Confidence
                  </h3>
                  <span className="text-sm text-orange-500 hover:text-orange-600 cursor-pointer">
                    Learn More
                  </span>
                </div>
                <div className="relative h-24 mb-4">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative w-24 h-24">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        {/* Background arc */}
                        <path
                          d="M 50,50 m 0,-40 a 40,40 0 1 1 0,80 a 40,40 0 1 1 0,-80"
                          fill="none"
                          stroke="#E5E7EB"
                          strokeWidth="8"
                        />
                        {/* Foreground arc */}
                        <path
                          d="M 50,50 m 0,-40 a 40,40 0 1 1 0,80 a 40,40 0 1 1 0,-80"
                          fill="none"
                          stroke="#3B82F6"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${(contributorConfidence?.percentage || 0) * 2.51} 251.2`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                          {contributorConfidence?.percentage || 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {contributorConfidence?.message}
                </p>
              </motion.div>

              {/* OpenSSF Score */}
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 p-6 rounded-xl border border-green-100 dark:border-green-900"
              >
                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-6">
                  OpenSSF Score
                </h3>

                {/* Graph */}
                <div className="mb-2">
                  <svg className="w-full h-10" viewBox="0 0 400 40" preserveAspectRatio="xMidYMid meet">
                    {/* Background line */}
                    <line
                      x1="40"
                      y1="20"
                      x2="360"
                      y2="20"
                      stroke="#E5E7EB"
                      strokeWidth="1.5"
                    />
                    {/* Score markers */}
                    {[0, 2.5, 5, 7.5, 10].map((score, index) => (
                      <g key={score}>
                        <line
                          x1={40 + (index * 80)}
                          y1="15"
                          x2={40 + (index * 80)}
                          y2="25"
                          stroke="#E5E7EB"
                          strokeWidth="1.5"
                        />
                        <text
                          x={40 + (index * 80)}
                          y="35"
                          textAnchor="middle"
                          className="text-[11px] fill-gray-500"
                        >
                          {score}
                        </text>
                      </g>
                    ))}
                    {/* Score indicator */}
                    <circle
                      cx={40 + ((5.4 / 10) * 320)}
                      cy="20"
                      r="4"
                      fill="#059669"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                  </svg>
                </div>

                {/* Score display */}
                <div className="flex justify-center mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-medium text-gray-900 dark:text-white">5.4</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">/ 10</span>
                  </div>
                </div>

                {/* Explanatory text */}
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    The OpenSSF Scorecard evaluates this repository's security practices and maintenance.
                  </p>
                  <div className="space-y-2">
                    {/* Risk level indicators */}
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                        <span>0-3: High Risk</span>
                      </div>
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                        <span>4-7: Medium</span>
                      </div>
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
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

              {/* Lottery Factor */}
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="bg-gradient-to-br from-orange-500/10 to-red-500/10 p-6 rounded-xl border border-orange-200 dark:border-orange-800"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Lottery Factor
                  </h3>
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Low</span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      YOLO Coders
                    </span>
                    <span className="text-xs text-gray-500">
                      Pushing commits directly to main
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    The top {lotteryContributors?.length || 0} contributors of this repository have made {
                      lotteryContributors?.reduce((sum, c) => sum + c.percentage, 0) || 0
                    }% of all pull requests in the past 30 days.
                  </p>
                  <div className="space-y-3">
                    {lotteryContributors?.map((contributor) => (
                      <div key={contributor.login} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img src={contributor.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                          <span className="text-sm text-gray-900 dark:text-white">{contributor.login}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">{contributor.pull_requests}</span>
                          <span className="text-sm text-gray-500">{contributor.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Pull Requests Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Pull Requests
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {pullRequestsData?.totalCount || 0} {prState} pull requests
                </p>
              </div>
              <select
                value={prState}
                onChange={(e) => {
                  setPrState(e.target.value as 'open' | 'closed');
                  setPage(1);
                  setAllPullRequests([]);
                }}
                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm"
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <button
                    onClick={handleOpenClick}
                    disabled={prState === 'open' || isSwitching}
                    className={`px-3 py-1 rounded-md text-sm ${
                      prState === 'open' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    Open ({prCounts?.open || 0})
                  </button>
                  <button
                    onClick={handleClosedClick}
                    disabled={prState === 'closed' || isSwitching}
                    className={`px-3 py-1 rounded-md text-sm ${
                      prState === 'closed'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    Closed ({prCounts?.closed || 0})
                  </button>
                </div>
              </div>

              {(isSwitching || (prsLoading && page === 1)) ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : allPullRequests.length === 0 ? (
                <div className="text-center text-gray-600 dark:text-gray-400 py-8">
                  No {prState} pull requests found
                </div>
              ) : (
                <>
                  {allPullRequests?.map((pr) => (
                    <motion.div
                      key={pr.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 border border-gray-200 dark:border-gray-700"
                    >
                      {/* Header */}
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex items-start space-x-3">
                          <img
                            src={pr.user.avatar_url}
                            alt={pr.user.login}
                            className="w-8 h-8 md:w-10 md:h-10 rounded-full flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <h3 
                              onClick={() => handleViewPullRequest(pr.number)}
                              onMouseEnter={() => prefetchPRDetails(pr)}
                              className="text-base md:text-lg font-medium text-gray-900 dark:text-white truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              {pr.title}
                            </h3>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs md:text-sm text-gray-500">
                              <span>#{pr.number}</span>
                              <span>•</span>
                              <span>{pr.user.login}</span>
                              <span>•</span>
                              <span>{formatDistanceToNow(new Date(pr.created_at), { addSuffix: true })}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {pr.draft && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                              Draft
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            pr.state === 'open'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                          }`}>
                            {pr.merged_at ? 'Merged' : pr.state}
                          </span>
                        </div>
                      </div>

                      {/* Stats Grid */}
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

                      {/* Labels */}
                      {pr.labels.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {pr.labels.map((label) => (
                            <span
                              key={label.name}
                              className="px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: `#${label.color}20`,
                                color: `#${label.color}`,
                              }}
                            >
                              {label.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Reviewers */}
                      {pr.requested_reviewers.length > 0 && (
                        <div className="mt-3">
                          <div className="text-xs md:text-sm text-gray-500 mb-1.5">Reviewers</div>
                          <div className="flex -space-x-2">
                            {pr.requested_reviewers.map((reviewer) => (
                              <img
                                key={reviewer.login}
                                src={reviewer.avatar_url}
                                alt={reviewer.login}
                                title={reviewer.login}
                                className="w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-white dark:border-gray-800"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Footer */}
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
                    </motion.div>
                  ))}
                  
                  {pullRequestsData?.hasMore && (
                    <div className="flex justify-center mt-4 md:mt-6">
                      <button
                        onClick={handleLoadMore}
                        disabled={prsLoading}
                        className="w-full md:w-auto px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors text-sm md:text-base font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {prsLoading ? 'Loading...' : `Load More (${allPullRequests.length} of ${pullRequestsData?.totalCount || 0})`}
                      </button>
                    </div>
                  )}

                  {!pullRequestsData?.hasMore && allPullRequests.length > 0 && (
                    <div className="text-center text-gray-600 dark:text-gray-400 py-4 md:py-8">
                      Showing {allPullRequests.length} of {pullRequestsData?.totalCount || 0} pull requests
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* About */}
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
              {repository.license && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  License: {repository.license.name}
                </div>
              )}
            </div>
          </div>

          {/* Top Contributors */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
              Top Contributors
            </h3>
            <div className="space-y-4">
              {topContributors?.map((contributor) => (
                <div 
                  key={contributor.login}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img 
                      src={contributor.avatar_url} 
                      alt={`${contributor.login}'s avatar`}
                      className="w-8 h-8 rounded-full"
                    />
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
                </div>
              ))}
              {topContributors && topContributors.length > 5 && (
                <button className="w-full py-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                  View all {topContributors.length} contributors
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <PullRequestDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        pullRequestDetails={prDetails}
        isLoading={isLoadingDetails}
      />
    </div>
  );
};

export default RepositoryDetails; 