import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatRelativeDate } from '../../../utils/formatDate';
import { MessageSquare, ExternalLink, ArrowUpRight } from 'lucide-react';
import type { Issue } from '../../../types/github';
import { getLabelColors } from '../utils/filterUtils';
import { RepoCellContent, LabelsCellContent } from '../../../components/ui/IssueTableCells';

interface IssueTableProps {
  issues: Issue[];
  onViewComments: (issue: Issue) => void;
}

const toRepoPath = (issue: Issue) => {
  const fullName = issue.repository?.fullName;
  if (!fullName) return null;
  const [owner, repo] = fullName.split('/');
  if (!owner || !repo) return null;
  return `/explore/${owner}/${repo}?issue=${issue.number}`;
};

const StatusBadge = ({ state }: { state: string }) => (
  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${
    state === 'open'
      ? 'bg-green-500/[0.08] border-green-500/20 text-green-400'
      : 'bg-purple-500/[0.08] border-purple-500/20 text-purple-400'
  }`}>
    <span className={`w-1 h-1 rounded-full ${state === 'open' ? 'bg-green-400' : 'bg-purple-400'}`} />
    {state}
  </span>
);

const IssueTable = memo(({ issues, onViewComments }: IssueTableProps) => {
  const navigate = useNavigate();

  return (
    <>
      {/* Desktop */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#0B1222] border-b border-white/[0.06]">
              <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-[38%]">Title</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-[18%]">Repository</th>
              <th className="hidden md:table-cell px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-[18%]">Labels</th>
              <th className="px-4 py-3 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-[10%]">Status</th>
              <th className="hidden lg:table-cell px-4 py-3 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-[10%]">Created</th>
              <th className="px-4 py-3 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-[6%]">
                <MessageSquare className="w-3 h-3 mx-auto" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {issues.map(issue => {
              const repoPath = toRepoPath(issue);
              return (
                <tr
                  key={`${issue.repository?.fullName}-${issue.number}`}
                  className="group hover:bg-white/[0.025] transition-colors duration-100"
                >
                  {/* Title */}
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => repoPath && navigate(repoPath)}
                      className="text-left w-full cursor-pointer"
                    >
                      <div className="flex items-start gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors line-clamp-1 leading-snug">
                            {issue.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5">#{issue.number}</p>
                        </div>
                        <ArrowUpRight className="w-3 h-3 text-gray-700 group-hover:text-blue-400 transition-colors shrink-0 mt-0.5 opacity-0 group-hover:opacity-100" />
                      </div>
                    </button>
                  </td>

                  {/* Repository */}
                  <td className="px-4 py-3.5">
                    <RepoCellContent
                      fullName={issue.repository?.fullName}
                      onClick={() => repoPath && navigate(repoPath.split('?')[0])}
                    />
                  </td>

                  {/* Labels */}
                  <td className="hidden md:table-cell px-4 py-3.5">
                    <LabelsCellContent labels={issue.labels} />
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5">
                    <div className="flex justify-center">
                      <StatusBadge state={issue.state} />
                    </div>
                  </td>

                  {/* Created */}
                  <td className="hidden lg:table-cell px-4 py-3.5 text-center">
                    <span className="text-xs text-gray-600 whitespace-nowrap">
                      {formatRelativeDate(issue.createdAt)}
                    </span>
                  </td>

                  {/* Comments + actions */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xs text-gray-600 w-4 text-center">{issue.commentsCount || '—'}</span>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onViewComments(issue)}
                          className="p-1 text-gray-600 hover:text-blue-400 transition-colors cursor-pointer rounded"
                          aria-label="View comments"
                        >
                          <MessageSquare size={13} />
                        </button>
                        <a
                          href={issue.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-gray-600 hover:text-gray-300 transition-colors rounded"
                          aria-label="Open on GitHub"
                        >
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden divide-y divide-white/[0.05]">
        {issues.map(issue => {
          const repoPath = toRepoPath(issue);
          return (
            <div
              key={`${issue.repository?.fullName}-${issue.number}`}
              className="px-4 py-3.5 hover:bg-white/[0.025] transition-colors"
            >
              <button
                onClick={() => repoPath && navigate(repoPath)}
                className="block text-left w-full cursor-pointer"
              >
                <p className="text-sm font-medium text-gray-200 leading-snug line-clamp-2">{issue.title}</p>
              </button>

              <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-600">
                <span>#{issue.number}</span>
                <span className="text-gray-700">·</span>
                <button
                  onClick={() => repoPath && navigate(repoPath.split('?')[0])}
                  className="hover:text-blue-400 transition-colors truncate max-w-[140px] cursor-pointer"
                >
                  {issue.repository?.fullName}
                </button>
              </div>

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <StatusBadge state={issue.state} />
                {issue.labels.slice(0, 2).map(label => (
                  <span
                    key={label.name}
                    className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-md"
                    style={getLabelColors(label.color)}
                  >
                    {label.name}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between mt-2.5">
                <span className="text-xs text-gray-600">{formatRelativeDate(issue.createdAt)}</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs text-gray-600">
                    <MessageSquare size={11} />
                    {issue.commentsCount}
                  </span>
                  <button onClick={() => onViewComments(issue)} className="p-1.5 text-gray-600 hover:text-blue-400 transition-colors cursor-pointer">
                    <MessageSquare size={15} />
                  </button>
                  <a href={issue.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-600 hover:text-gray-300 transition-colors">
                    <ExternalLink size={15} />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
});

IssueTable.displayName = 'IssueTable';
export default IssueTable;
