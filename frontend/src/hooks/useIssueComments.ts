import { useState, useCallback, useMemo } from 'react';
import { useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { getIssueComments, addIssueComment } from '../services/github';
import type { Issue } from '../types/github';
import { toast } from 'react-hot-toast';

const useIssueComments = () => {
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const {
    data: commentsData,
    isLoading: isLoadingComments,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage
  } = useInfiniteQuery({
    queryKey: ['comments', selectedIssueId, selectedRepo],
    queryFn: async ({
      pageParam = 1
    }) => {
      if (selectedIssueId && selectedRepo) {
        return await getIssueComments(selectedIssueId, selectedRepo, pageParam);
      }
      return null;
    },
    initialPageParam: 1,
    enabled: !!selectedIssueId && !!selectedRepo,
    getNextPageParam: lastPage => {
      if (!lastPage) return undefined;
      return lastPage.hasMore ? lastPage.nextPage : undefined;
    }
  });
  const allComments = useMemo(() => commentsData?.pages?.flatMap(page => page?.comments ?? []) ?? [], [commentsData]);
  const queryClient = useQueryClient();
  const addCommentMutation = useMutation({
    mutationFn: ({
      issueId,
      comment
    }: {
      issueId: number;
      comment: string;
    }) => {
      if (!selectedRepo) throw new Error('No repository selected');
      return addIssueComment(issueId, selectedRepo, comment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', selectedIssueId, selectedRepo] });
      toast.success('Comment added');
    },
    onError: error => {
      console.error('Error adding comment:', error);
      const message = error instanceof Error ? error.message : 'Failed to add comment';
      toast.error(message || 'Failed to add comment');
    }
  });
  const handleViewComments = useCallback((issue: Issue) => {
    const key = `${issue.repository.fullName}#${issue.number}`;
    const currentKey = selectedRepo && selectedIssueId ? `${selectedRepo}#${selectedIssueId}` : null;
    if (key !== currentKey) {
      setSelectedIssueId(issue.number);
      setSelectedRepo(issue.repository.fullName);
      setIsCommentsModalOpen(true);
    }
  }, [selectedIssueId, selectedRepo]);
  const handleCloseComments = useCallback(() => {
    setIsCommentsModalOpen(false);
    setSelectedIssueId(null);
    setSelectedRepo(null);
  }, []);
  const handleAddComment = useCallback(async (comment: string) => {
    if (!selectedIssueId) return;
    return addCommentMutation.mutateAsync({
      issueId: selectedIssueId,
      comment
    });
  }, [selectedIssueId, addCommentMutation]);
  return {
    isCommentsModalOpen,
    allComments,
    isLoadingComments,
    hasMoreComments: !!hasNextPage,
    isLoadingMore: isFetchingNextPage,
    onLoadMore: fetchNextPage,
    handleViewComments,
    handleCloseComments,
    handleAddComment
  };
};
export default useIssueComments;