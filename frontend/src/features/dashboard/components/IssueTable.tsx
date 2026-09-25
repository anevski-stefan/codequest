import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatRelativeDate } from '../../../utils/formatDate';
import { MessageSquare, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { easeOut } from '../../../lib/motion';
import type { Issue } from '../../../types/github';
import { LabelsCellContent } from '../../../components/ui/IssueTableCells';

interface IssueTableProps {
  issues: Issue[];
  onViewComments: (issue: Issue) => void;
  onPrefetchComments?: (issue: Issue) => void;
}

const toRepoPath = (issue: Issue) => {
  const fullName = issue.repository?.fullName;
  if (!fullName) return null;
  const [owner, repo] = fullName.split('/');
  if (!owner || !repo) return null;
  return `/explore/${owner}/${repo}?issue=${issue.number}`;
};

const StatusBadge = ({ state }: { state: string }) => (
  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold border shrink-0 capitalize ${
    state === 'open'
      ? 'bg-green-500/[0.08] border-green-500/20 text-green-400'
      : 'bg-white/[0.05] border-white/[0.09] text-gray-500'
  }`}>
    <span className={`w-1 h-1 rounded-full ${state === 'open' ? 'bg-green-400' : 'bg-gray-500'}`} />
    {state}
  </span>
);

const IssueTable = memo(({ issues, onViewComments, onPrefetchComments }: IssueTableProps) => {
  const navigate = useNavigate();

  return (
    <div className="px-4 lg:px-6 xl:px-8 py-4 grid grid-cols-1 lg:grid-cols-2 gap-2.5">
      {issues.map((issue, index) => {
        const repoPath = toRepoPath(issue);
        const [repoOwner, repoName] = (issue.repository?.fullName ?? '').split('/');

        return (
          <motion.div
            key={`${issue.repository?.fullName}-${issue.number}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            // Stagger within each fetched page so "Load more" batches cascade too.
            transition={{ duration: 0.4, ease: easeOut, delay: (index % 30) * 0.025 }}
            role="link"
            tabIndex={0}
            aria-label={`${issue.title} — ${issue.repository?.fullName ?? ''}`}
            className="group relative flex flex-col rounded-xl border border-white/[0.07] bg-[#2E3245] p-4 hover:border-white/[0.14] hover:bg-[#31364C] hover:-translate-y-px hover:shadow-[0_12px_24px_-12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-0 active:scale-[0.995] transition-[background-color,border-color,box-shadow,transform] duration-200 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
            onClick={() => repoPath && navigate(repoPath)}
            onKeyDown={e => { if (e.key === 'Enter' && repoPath) navigate(repoPath); }}
            onMouseEnter={() => onPrefetchComments?.(issue)}
            onFocus={() => onPrefetchComments?.(issue)}
          >
            {/* Row 1: title + status */}
            <div className="flex items-start gap-3 mb-2">
              <p className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors line-clamp-2 leading-snug flex-1">
                {issue.title}
              </p>
              <StatusBadge state={issue.state} />
            </div>

            {/* Row 2: number · repo · date */}
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-3 min-w-0">
              <span className="font-mono text-gray-500 tabular">#{issue.number}</span>
              <span className="text-gray-600">·</span>
              {repoOwner && repoName ? (
                <span className="truncate">
                  <span className="text-gray-500">{repoOwner}/</span>
                  <span className="text-gray-300 font-medium">{repoName}</span>
                </span>
              ) : (
                <span className="text-gray-400 truncate">{issue.repository?.fullName}</span>
              )}
              <span className="ml-auto pl-2 text-gray-500 whitespace-nowrap shrink-0">{formatRelativeDate(issue.createdAt)}</span>
            </div>

            {/* Row 3: labels + actions */}
            <div className="flex items-center gap-2 mt-auto min-h-[26px]">
              <LabelsCellContent labels={issue.labels} />
              <div className="ml-auto flex items-center gap-0.5 [@media(hover:hover)]:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shrink-0">
                {issue.commentsCount > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-gray-500 mr-1">
                    <MessageSquare size={11} />
                    {issue.commentsCount}
                  </span>
                )}
                <button
                  onClick={e => { e.stopPropagation(); onViewComments(issue); }}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:text-blue-400 hover:bg-blue-400/[0.08] transition-all cursor-pointer"
                  aria-label="View comments"
                >
                  <MessageSquare size={13} />
                </button>
                <a
                  href={issue.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] transition-all"
                  aria-label="Open on GitHub"
                >
                  <ArrowUpRight size={13} />
                </a>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
});

IssueTable.displayName = 'IssueTable';
export default IssueTable;
