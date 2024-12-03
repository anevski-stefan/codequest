import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Send, Loader2, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
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

  // Update displayed comments when comments prop changes
  useEffect(() => {
    // Sort comments by date, oldest first
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

  console.log('Comments data:', comments.map(c => ({ 
    id: c.id, 
    createdAt: c.createdAt,
    date: new Date(c.createdAt)
  })));

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
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={onClose}
                  >
                    <X className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mt-3 w-full text-center sm:mt-0 sm:text-left">
                    <Dialog.Title as="h3" className="text-xl font-semibold leading-6 text-gray-900 mb-4">
                      Comments
                    </Dialog.Title>
                    
                    <div className="mt-2 space-y-4 max-h-[400px] overflow-y-auto">
                      {isLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        </div>
                      ) : displayedComments.length === 0 ? (
                        <p className="text-center text-gray-500 py-4">No comments yet</p>
                      ) : (
                        <>
                          {hasMoreComments && (
                            <div className="flex justify-center py-2 sticky top-0 bg-white shadow-sm">
                              <button
                                onClick={onLoadMore}
                                disabled={isLoadingMore}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                            <div key={comment.id} className="mb-4 p-4 bg-white rounded-lg shadow">
                              <div className="flex items-center mb-2">
                                <img
                                  src={comment.user.avatar_url}
                                  alt={comment.user.login}
                                  className="w-8 h-8 rounded-full mr-2"
                                />
                                <span className="font-medium">{comment.user.login}</span>
                                <span className="text-gray-500 text-sm ml-2">
                                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                              <div className="prose max-w-none">
                                {comment.body}
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>

                    <form onSubmit={handleSubmit} className="mt-4">
                      <div className="relative">
                        <textarea
                          rows={3}
                          className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm resize-none"
                          placeholder="Add a comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                        />
                        <button
                          type="submit"
                          disabled={isSubmitting || !newComment.trim()}
                          className="absolute bottom-2 right-2 inline-flex items-center rounded-full bg-blue-600 p-2 text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Send className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </form>
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