import { useMemo } from 'react';
import type { Comment } from '../types/comments';
export function useCommentSorting(comments: Comment[]) {
  return useMemo(() =>
    [...comments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
  [comments]);
}