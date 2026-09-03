import { motion } from 'framer-motion';
import { Star, GitFork } from 'lucide-react';
import type { GitHubRepo } from '../../types/github';

interface RepositoryListProps {
  repos: GitHubRepo[];
}

const RepositoryList = ({ repos }: RepositoryListProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {repos.map((repo) => (
      <motion.a
        key={repo.id}
        href={repo.html_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        whileHover={{ scale: 1.02 }}
      >
        <h4 className="text-base font-semibold text-blue-600 dark:text-blue-400">
          {repo.name}
        </h4>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          {repo.description || 'No description available'}
        </p>
        <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
          {repo.language && (
            <span className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-blue-500 mr-1"></span>
              {repo.language}
            </span>
          )}
          <span className="flex items-center">
            <Star className="w-4 h-4 mr-1" />
            {repo.stargazers_count}
          </span>
          <span className="flex items-center">
            <GitFork className="w-4 h-4 mr-1" />
            {repo.forks_count}
          </span>
        </div>
      </motion.a>
    ))}
  </div>
);

export default RepositoryList;
