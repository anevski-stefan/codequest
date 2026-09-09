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
export interface CommentsModalIssue {
  number: number;
  title: string;
  repository: { fullName: string };
}

export interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  comments: Comment[];
  isLoading: boolean;
  onAddComment: (comment: string) => Promise<void>;
  onLoadMore: () => void;
  hasMoreComments: boolean;
  isLoadingMore: boolean;
  issue?: CommentsModalIssue | null;
}