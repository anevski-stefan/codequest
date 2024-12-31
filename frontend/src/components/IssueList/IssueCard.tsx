import { IssueLabel } from './IssueLabel';
import { IssueMetadata } from './IssueMetadata';
import { IssueActions } from './IssueActions';
import type { IssueCardProps } from './types';

export const IssueCard = ({ issue, onViewComments }: IssueCardProps) => (
  <div 
    key={`${issue.repository?.fullName}-${issue.number}`} 
    className="relative py-4 group"
  >
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gray-50/5 dark:bg-white/5 transition-opacity rounded-lg" />
    <div className="relative">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-start justify-between">
          <div className="flex-1">
            <a 
              href={issue.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-sm md:text-base font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
            >
              {issue.title}
            </a>
            <p className="mt-0.5 text-xs md:text-sm text-gray-500 dark:text-gray-400">
              {issue.repository?.fullName} #{issue.number}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2 md:mt-0 md:ml-4">
            {issue.labels.map((label) => (
              <IssueLabel key={label.name} name={label.name} color={label.color} />
            ))}
          </div>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-0 text-sm">
          <IssueMetadata issue={issue} />
          <IssueActions issue={issue} onViewComments={onViewComments} />
        </div>
      </div>
    </div>
  </div>
); 