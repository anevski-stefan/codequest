import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { GitFork } from 'lucide-react';
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
import { getRepositoryDetails, getTopContributors, getLotteryContributors, getContributorConfidence } from '../../services/github';

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
  usePageTitle(`${owner}/${repo}`);

  const { data: repository, isLoading: repoLoading } = useQuery<Repository>(
    ['repository', owner, repo],
    () => getRepositoryDetails(owner!, repo!)
  );

  const { data: topContributors } = useQuery<TopContributor[]>(
    ['top-contributors', owner, repo],
    () => getTopContributors(owner!, repo!)
  );

  const { data: lotteryContributors } = useQuery<LotteryContributor[]>(
    ['lottery-contributors', owner, repo],
    () => getLotteryContributors(owner!, repo!)
  );

  const { data: contributorConfidence } = useQuery<ContributorConfidence>(
    ['contributor-confidence', owner, repo],
    () => getContributorConfidence(owner!, repo!)
  );

  if (repoLoading) return <LoadingSpinner />;
  if (!repository) return null;

  return (
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <img src={repository.owner.avatar_url} alt="" className="w-16 h-16 rounded" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {repository.full_name}
          </h1>
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
    </div>
  );
};

export default RepositoryDetails; 