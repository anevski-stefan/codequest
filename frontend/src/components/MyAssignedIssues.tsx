import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from 'react-query';
import { getAssignedIssues, getIssueComments, addIssueComment } from '../services/github';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, GitPullRequest, MessageSquare } from 'lucide-react';
import type { Issue } from '../types/github';
import CommentsModal from './CommentsModal';

const getStateColor = (state: string) => {
  switch (state.toLowerCase()) {
    case 'open':
      return 'bg-green-100 text-green-800';
    case 'closed':
      return 'bg-red-100 text-red-800';
    case 'completed':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const MyAssignedIssues = () => {
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);

  const { data, isLoading, error } = useQuery('assignedIssues', getAssignedIssues);
  const queryClient = useQueryClient();

  // Comments query
  const { 
    data: commentsData, 
    isLoading: isLoadingComments,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage
  } = useInfiniteQuery(
    ['comments', selectedIssueId, selectedRepo],
    async ({ pageParam = 1 }) => {
      if (selectedIssueId && selectedRepo) {
        return await getIssueComments(selectedIssueId, selectedRepo, pageParam);
      }
      return null;
    },
    {
      enabled: !!selectedIssueId && !!selectedRepo,
      getNextPageParam: (lastPage) => {
        if (!lastPage) return undefined;
        return lastPage.hasMore ? lastPage.nextPage : undefined;
      },
    }
  );

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: ({ issueId, comment }: { issueId: number; comment: string }) => {
      if (!selectedRepo) {
        throw new Error('No repository selected');
      }
      return addIssueComment(issueId, selectedRepo, comment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['comments', selectedIssueId, selectedRepo]);
    }
  });

  const handleViewComments = (issue: Issue) => {
    setSelectedIssueId(issue.number);
    setSelectedRepo(issue.repository.fullName);
    setIsCommentsModalOpen(true);
  };

  const handleAddComment = async (comment: string) => {
    if (!selectedIssueId) return;
    try {
      await addCommentMutation.mutateAsync({
        issueId: selectedIssueId,
        comment
      });
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  // Flatten comments data
  const allComments = commentsData?.pages?.flatMap(page => page?.comments ?? []) ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error instanceof Error) {
    return (
      <div className="text-center text-red-600 p-4 mb-4 bg-red-50 rounded-lg">
        {error.message || 'Failed to load assigned issues'}
      </div>
    );
  }

  return (
    <>
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            My Assigned Issues
          </h3>
        </div>
        <ul className="divide-y divide-gray-200">
          {data?.issues.map((issue: Issue) => (
            <li key={issue.id}>
              <div className="block hover:bg-gray-50">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-blue-600 truncate">
                      {issue.repository.fullName} #{issue.number}: {issue.title}
                    </p>
                    <div className="ml-2 flex-shrink-0 flex gap-2">
                      {issue.labels.map((label) => (
                        <span
                          key={label.name}
                          className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                          style={{
                            backgroundColor: `#${label.color}`,
                            color: parseInt(label.color, 16) > 0xffffff / 2 ? '#000' : '#fff'
                          }}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm">
                        <GitPullRequest className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStateColor(issue.state)}`}>
                          {issue.state}
                        </span>
                      </p>
                      <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                        <MessageCircle className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                        {issue.commentsCount} comments
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <p>
                        Updated {formatDistanceToNow(new Date(issue.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <button
                        onClick={() => handleViewComments(issue)}
                        className="flex items-center hover:text-blue-600"
                      >
                        <MessageSquare className="flex-shrink-0 mr-1.5 h-5 w-5" />
                        View Comments
                      </button>
                      <a
                        href={issue.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-sm text-gray-600 hover:text-blue-600 ml-4"
                      >
                        View on GitHub
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <CommentsModal
        isOpen={isCommentsModalOpen}
        onClose={() => {
          setIsCommentsModalOpen(false);
          setSelectedIssueId(null);
        }}
        comments={allComments}
        isLoading={isLoadingComments}
        onAddComment={handleAddComment}
        onLoadMore={() => fetchNextPage()}
        hasMoreComments={!!hasNextPage}
        isLoadingMore={isFetchingNextPage}
      />
    </>
  );
};

export default MyAssignedIssues; 