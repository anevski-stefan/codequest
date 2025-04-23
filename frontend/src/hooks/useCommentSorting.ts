import { useState, useEffect } from 'react';
import type { Comment } from '../types/comments';

export function useCommentSorting(comments: Comment[]) {
  const [sortedComments, setSortedComments] = useState(comments);

  useEffect(() => {
    const sorted = [...comments].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    setSortedComments(sorted);
  }, [comments]);

  return sortedComments;
} 