import { MessageSquare } from 'lucide-react';
import type { Issue } from '../../types/github';
import { buttonBaseClasses } from './constants';

interface IssueActionsProps {
  issue: Issue;
  onViewComments: (issue: Issue) => void;
}

export const IssueActions = ({ issue, onViewComments }: IssueActionsProps) => (
  <div className="flex flex-wrap items-center gap-2 md:space-x-3">
    <button
      onClick={() => onViewComments(issue)}
      className={`flex-1 md:flex-none ${buttonBaseClasses}`}
    >
      <MessageSquare size={14} className="mr-1.5" />
      View Comments
    </button>
    <a 
      href={issue.url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className={`flex-1 md:flex-none ${buttonBaseClasses}`}
    >
      View on GitHub
    </a>
  </div>
); 