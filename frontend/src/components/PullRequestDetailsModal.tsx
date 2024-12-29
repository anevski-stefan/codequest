import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState, useMemo, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { X, GitCommit, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

export interface PullRequestFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export interface PullRequestDetails {
  number: number;
  title: string;
  state: string;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  closed_at: string | null;
  user: {
    login: string;
    avatar_url: string;
  };
  files: PullRequestFile[];
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
  comments: number;
  review_comments: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  pullRequestDetails?: PullRequestDetails;
  isLoading: boolean;
}

type TabType = 'commits' | 'changes';

export default function PullRequestDetailsModal({ isOpen, onClose, pullRequestDetails, isLoading }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('changes');
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const toggleFile = useCallback((filename: string) => {
    setExpandedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filename)) {
        newSet.delete(filename);
      } else {
        newSet.add(filename);
      }
      return newSet;
    });
  }, []);

  const formatDate = useCallback((dateString?: string) => {
    if (!dateString) return '';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      console.error('Invalid date:', dateString);
      return '';
    }
  }, []);

  const headerContent = useMemo(() => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          <div className="space-y-2">
            <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      );
    }

    if (!pullRequestDetails) {
      return <div>Error loading pull request details</div>;
    }

    return (
      <div className="flex items-center gap-4">
        {pullRequestDetails.user?.avatar_url && (
          <img
            src={pullRequestDetails.user.avatar_url}
            alt={pullRequestDetails.user.login || 'User avatar'}
            className="w-10 h-10 rounded-full"
          />
        )}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {pullRequestDetails.title}
          </h2>
          <p className="text-sm text-gray-500">
            #{pullRequestDetails.number} 
            {pullRequestDetails.user?.login && ` opened by ${pullRequestDetails.user.login}`}
            {pullRequestDetails.created_at && ` ${formatDate(pullRequestDetails.created_at)}`}
          </p>
        </div>
      </div>
    );
  }, [isLoading, pullRequestDetails, formatDate]);

  const tabContent = useMemo(() => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      );
    }

    switch (activeTab) {
      case 'changes':
        return pullRequestDetails?.files?.length ? (
          <div className="space-y-4">
            {pullRequestDetails.files.map((file) => {
              const isExpanded = expandedFiles.has(file.filename);
              
              const getStatusLabel = (status: string) => {
                switch (status) {
                  case 'added':
                    return 'new file';
                  case 'removed':
                    return 'removed file';
                  case 'modified':
                    return 'modified';
                  case 'renamed':
                    return 'renamed';
                  default:
                    return status;
                }
              };

              const getStatusStyles = (status: string) => {
                switch (status) {
                  case 'added':
                    return 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-300';
                  case 'removed':
                    return 'bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-300';
                  case 'modified':
                    return 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-300';
                  case 'renamed':
                    return 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300';
                  default:
                    return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
                }
              };

              return (
                <div
                  key={file.filename}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggleFile(file.filename)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-gray-900 dark:text-white">
                        {file.filename}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusStyles(file.status)}`}>
                        {getStatusLabel(file.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-green-600">+{file.additions}</span>
                        <span className="text-red-600">-{file.deletions}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                  </button>
                  {isExpanded && file.patch && (
                    <div className="p-4 overflow-x-auto border-t border-gray-200 dark:border-gray-700">
                      <pre className="text-sm font-mono whitespace-pre">
                        {file.patch.split('\n').map((line, index) => (
                          <div
                            key={index}
                            className={`${
                              line.startsWith('+') ? 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-300' :
                              line.startsWith('-') ? 'bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-300' :
                              line.startsWith('@') ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300' :
                              'text-gray-800 dark:text-gray-200'
                            }`}
                          >
                            {line}
                          </div>
                        ))}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null;

      case 'commits':
        return (
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-2">
              <GitCommit className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {pullRequestDetails?.commits} commits in this pull request
              </span>
            </div>
          </div>
        );

      default:
        return null;
    }
  }, [activeTab, isLoading, pullRequestDetails, expandedFiles, toggleFile]);

  if (!isOpen) return null;

  console.log('Modal PR Details:', {
    isLoading,
    pullRequestDetails,
    filesCount: pullRequestDetails?.files?.length,
    files: pullRequestDetails?.files
  });

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="fixed inset-0 z-50 overflow-y-auto" onClose={onClose}>
        <div className="flex items-center justify-center min-h-screen px-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50" />
          </Transition.Child>

          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="relative bg-white dark:bg-gray-800 rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                {headerContent}
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Simplified tabs */}
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-8 px-4" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab('changes')}
                    className={`flex items-center gap-2 py-4 text-sm font-medium border-b-2 ${
                      activeTab === 'changes'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>{pullRequestDetails?.changed_files} changed files</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('commits')}
                    className={`flex items-center gap-2 py-4 text-sm font-medium border-b-2 ${
                      activeTab === 'commits'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <GitCommit className="w-4 h-4" />
                    <span>{pullRequestDetails?.commits} commits</span>
                  </button>
                </nav>
              </div>

              {/* Content based on active tab */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
                {tabContent}
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
} 