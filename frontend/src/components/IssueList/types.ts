import { Issue } from '../../types/github';

export interface IssueListProps {
  issues: Issue[];
  onViewComments: (issue: Issue) => void;
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  onLoadMore: () => void;
}

export interface IssueCardProps {
  issue: Issue;
  onViewComments: (issue: Issue) => void;
}

export interface IssueMetadataProps {
  issue: Issue;
}

export interface IssueActionsProps {
  issue: Issue;
  onViewComments: (issue: Issue) => void;
}

export interface IssueLabelProps {
  name: string;
  color: string;
}

export interface LoadMoreButtonProps {
  onClick: () => void;
} 