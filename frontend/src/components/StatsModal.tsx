import { Dialog } from '@headlessui/react';
import { X, Star, GitFork } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

interface User {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
}

interface Repository {
  id: number;
  name: string;
  html_url: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
}

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: User[] | Repository[] | null | undefined;
  isLoading: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

export default function StatsModal({ 
  isOpen, 
  onClose, 
  title, 
  data, 
  isLoading,
  hasMore = false,
  onLoadMore,
  isLoadingMore = false 
}: StatsModalProps) {
  const isUserData = (item: any): item is User => 'login' in item;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 max-h-[70vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {data?.map((item) => (
                    isUserData(item) ? (
                      <a
                        key={item.id}
                        href={item.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <img
                          src={item.avatar_url}
                          alt={item.login}
                          className="w-10 h-10 rounded-full"
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.login}
                        </span>
                      </a>
                    ) : (
                      <a
                        key={item.id}
                        href={item.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <h4 className="text-base font-semibold text-blue-600 dark:text-blue-400">
                          {item.name}
                        </h4>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                          {item.description || 'No description available'}
                        </p>
                        <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          {item.language && (
                            <span className="flex items-center">
                              <span className="w-3 h-3 rounded-full bg-blue-500 mr-1"></span>
                              {item.language}
                            </span>
                          )}
                          <span className="flex items-center">
                            <Star className="w-4 h-4 mr-1" />
                            {item.stargazers_count}
                          </span>
                          <span className="flex items-center">
                            <GitFork className="w-4 h-4 mr-1" />
                            {item.forks_count}
                          </span>
                        </div>
                      </a>
                    )
                  ))}
                </div>

                {hasMore && (
                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={onLoadMore}
                      disabled={isLoadingMore}
                      className="px-4 py-2 h-9 min-w-[120px] inline-flex items-center justify-center text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {isLoadingMore ? (
                        <div className="flex items-center justify-center gap-2">
                          <LoadingSpinner size="sm" />
                          <span>Loading...</span>
                        </div>
                      ) : (
                        <span>Load More</span>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 