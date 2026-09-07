import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, ExternalLink, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatRelativeDate } from '../utils/formatDate';
import { getLabelColors } from '../features/dashboard/utils/filterUtils';
import { CommentsList } from './comments/CommentsList';
import { CommentForm } from './comments/CommentForm';
import LoadingSpinner from './LoadingSpinner';
import { explainIssue } from '../services/github';
import type { Issue } from '../types/github';
import type { Comment } from '../types/comments';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  issue: Issue | null;
  comments: Comment[];
  isLoadingComments: boolean;
  hasMoreComments: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onAddComment: (comment: string) => Promise<void>;
  owner?: string;
  repo?: string;
  repoLanguage?: string | null;
  repoDescription?: string;
}

export default function IssueDetailsModal({
  isOpen,
  onClose,
  issue,
  comments,
  isLoadingComments,
  hasMoreComments,
  isLoadingMore,
  onLoadMore,
  onAddComment,
  owner,
  repo,
  repoLanguage,
  repoDescription,
}: Props) {
  const [explanation, setExplanation] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    setExplanation('');
    setIsExplaining(false);
    setExplainError(null);
    setShowExplanation(false);
  }, [issue?.id]);

  const handleExplain = async () => {
    if (!issue || !owner || !repo) return;
    setIsExplaining(true);
    setExplainError(null);
    setExplanation('');
    setShowExplanation(true);
    await explainIssue({
      owner,
      repo,
      issueTitle: issue.title,
      issueBody: issue.body,
      comments: comments.map(c => ({ user: { login: c.user.login }, body: c.body })),
      repoLanguage,
      repoDescription,
      onChunk: (text) => setExplanation(prev => prev + text),
      onDone: () => setIsExplaining(false),
      onError: (err) => { setExplainError(err); setIsExplaining(false); },
    });
  };

  if (!issue) return null;

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl bg-white dark:bg-[#0B1222] shadow-xl">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                        issue.state === 'open'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${issue.state === 'open' ? 'bg-green-500' : 'bg-purple-500'}`} />
                        {issue.state}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">#{issue.number}</span>
                    </div>
                    <Dialog.Title className="text-base font-semibold text-gray-900 dark:text-white leading-snug">
                      {issue.title}
                    </Dialog.Title>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {issue.repository.fullName} · opened {formatRelativeDate(issue.createdAt)} by{' '}
                      <span className="font-medium">{issue.user.login}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {owner && repo && (
                      <button
                        onClick={handleExplain}
                        disabled={isExplaining}
                        title="Explain with AI"
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:hover:bg-violet-900/40 disabled:opacity-50 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {isExplaining ? 'Explaining…' : 'Explain'}
                      </button>
                    )}
                    <a
                      href={issue.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      title="Open on GitHub"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
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

                  {/* Issue body */}
                  {issue.body ? (
                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed border border-gray-100 dark:border-gray-700/60 rounded-lg p-4 bg-gray-50 dark:bg-white/[0.03]">
                      {issue.body}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">No description provided.</p>
                  )}

                  {/* AI explanation */}
                  {showExplanation && (
                    <div className="rounded-lg border border-violet-200 dark:border-violet-800/50 overflow-hidden">
                      <button
                        onClick={() => setShowExplanation(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-violet-50 dark:bg-violet-900/20 text-xs font-semibold text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          AI Explanation
                        </span>
                        {showExplanation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      <div className="px-4 py-3 bg-white dark:bg-gray-900/40">
                        {explainError ? (
                          <p className="text-sm text-red-500 dark:text-red-400">{explainError}</p>
                        ) : explanation ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                            <ReactMarkdown>{explanation}</ReactMarkdown>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 py-2">
                            <LoadingSpinner />
                            <span className="text-sm text-gray-400">Thinking…</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Comments */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      Comments ({issue.commentsCount})
                    </h3>
                    {isLoadingComments ? (
                      <div className="flex justify-center py-6"><LoadingSpinner /></div>
                    ) : (
                      <CommentsList
                        comments={comments}
                        isLoading={false}
                        hasMoreComments={hasMoreComments}
                        isLoadingMore={isLoadingMore}
                        onLoadMore={onLoadMore}
                      />
                    )}
                  </div>
                </div>

                {/* Comment form */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                  <CommentForm onSubmit={onAddComment} />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
