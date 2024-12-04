import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Send, Loader2, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import LoadingSpinner from '../components/LoadingSpinner';

export interface Comment {
  id: number;
  body: string;
  user: {
    login: string;
    avatar_url: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  comments: Comment[];
  isLoading: boolean;
  onAddComment: (comment: string) => void;
  onLoadMore: () => void;
  hasMoreComments: boolean;
  isLoadingMore: boolean;
}

export default function CommentsModal({
  isOpen,
  onClose,
  comments,
  isLoading,
  onAddComment,
  onLoadMore,
  hasMoreComments,
  isLoadingMore
}: CommentsModalProps) {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [displayedComments, setDisplayedComments] = useState<Comment[]>([]);

  useEffect(() => {
    const sortedComments = [...comments].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    setDisplayedComments(sortedComments);
  }, [comments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onAddComment(newComment);
      setNewComment('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                <div className="bg-white dark:bg-gray-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="absolute right-0 top-0 pr-4 pt-4">
                    <button
                      type="button"
                      className="rounded-md bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                      onClick={onClose}
                    >
                      <X className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:text-left">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900 dark:text-gray-200">
                      Comments
                    </Dialog.Title>
                    <div className="mt-4 space-y-4">
                      <div className="max-h-[400px] overflow-y-auto mb-6 pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
                        {isLoading ? (
                          <LoadingSpinner size="sm" />
                        ) : displayedComments.length === 0 ? (
                          <p className="text-center text-gray-500 dark:text-gray-400 py-4">No comments yet</p>
                        ) : (
                          <>
                            {hasMoreComments && (
                              <div className="flex justify-center py-2 sticky top-0 bg-white dark:bg-gray-800 shadow-sm">
                                <button
                                  onClick={onLoadMore}
                                  disabled={isLoadingMore}
                                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                                >
                                  {isLoadingMore ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : (
                                    <ChevronUp className="h-4 w-4 mr-2" />
                                  )}
                                  Load earlier comments
                                </button>
                              </div>
                            )}
                            {displayedComments.map((comment) => (
                              <div key={comment.id} className="mb-6 last:mb-0 bg-gray-100 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                <div className="flex items-start space-x-4">
                                  <img
                                    src={comment.user.avatar_url}
                                    alt={comment.user.login}
                                    className="w-10 h-10 rounded-full flex-shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="font-semibold text-gray-900 dark:text-gray-200 truncate">
                                        {comment.user.login}
                                      </h4>
                                      <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                      </span>
                                    </div>
                                    <div className="prose prose-sm max-w-none text-gray-800 dark:text-gray-300 break-words whitespace-pre-wrap">
                                      {comment.body}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-4">
                        <textarea
                          rows={3}
                          className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                          placeholder="Add a comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                        />
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={isSubmitting || !newComment.trim()}
                            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-300 ease-in-out transform hover:-translate-y-1 flex items-center gap-2"
                          >
                            {isSubmitting ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <>
                                Post Comment
                                <Send className="h-5 w-5" />
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 