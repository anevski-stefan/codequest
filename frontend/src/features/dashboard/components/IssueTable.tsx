import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, ExternalLink } from 'lucide-react';
import type { Issue } from '../../../types/github';
import { getStateColor, getLabelColors } from '../utils/filterUtils';

interface IssueTableProps {
  issues: Issue[];
  onViewComments: (issue: Issue) => void;
}

const IssueTable = ({ issues, onViewComments }: IssueTableProps) => {
  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden sm:block">
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" className="w-[35%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Title
                </th>
                <th scope="col" className="w-[25%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Repository
                </th>
                <th scope="col" className="hidden md:table-cell w-[20%] px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Labels
                </th>
                <th scope="col" className="w-[10%] px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="hidden lg:table-cell w-[15%] px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th scope="col" className="w-[10%] px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Comments
                </th>
                <th scope="col" className="w-[10%] px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {issues.map((issue) => (
                <tr key={`${issue.repository?.fullName}-${issue.number}`} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4">
                    <a
                      href={issue.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group"
                    >
                      <div className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {issue.title}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        #{issue.number}
                      </div>
                    </a>
                  </td>
                  <td className="px-6 py-4 max-w-0">
                    <a
                      href={`https://github.com/${issue.repository?.fullName}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 block truncate"
                      title={issue.repository?.fullName}
                    >
                      {issue.repository?.fullName}
                    </a>
                  </td>
                  <td className="hidden md:table-cell px-6 py-4">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {issue.labels.length > 0 ? (
                        issue.labels.map((label) => (
                          <span
                            key={label.name}
                            className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full truncate max-w-[120px]"
                            style={getLabelColors(label.color)}
                            title={label.name}
                          >
                            {label.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                          No labels
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${getStateColor(issue.state)}`}>
                        <span className={`w-2 h-2 rounded-full mr-2 ${
                          issue.state === 'open' ? 'bg-green-500' : 'bg-purple-500'
                        }`} />
                        {issue.state}
                      </span>
                    </div>
                  </td>
                  <td className="hidden lg:table-cell px-6 py-4">
                    <div className="flex justify-center items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-4">
                    <div className="flex justify-center items-center w-full">
                      <span className="inline-flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                        {issue.commentsCount}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-center whitespace-nowrap">
                    <div className="flex justify-center space-x-3">
                      <button
                        onClick={() => onViewComments(issue)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <MessageSquare size={16} />
                      </button>
                      <a
                        href={issue.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-4">
        {issues.map((issue) => (
          <div
            key={`${issue.repository?.fullName}-${issue.number}`}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 space-y-3"
          >
            <div className="space-y-2">
              <a
                href={issue.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <h3 className="text-base font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {issue.title}
                </h3>
              </a>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>#{issue.number}</span>
                  <span>•</span>
                  <a
                    href={`https://github.com/${issue.repository?.fullName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {issue.repository?.fullName}
                  </a>
                </div>
              </div>
            </div>

            {/* Status and Labels sections */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Status:
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${getStateColor(issue.state)}`}>
                  <span className={`w-2 h-2 rounded-full mr-2 ${
                    issue.state === 'open' ? 'bg-green-500' : 'bg-purple-500'
                  }`} />
                  {issue.state}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Labels:
                </span>
                {issue.labels.length > 0 ? (
                  issue.labels.map((label) => (
                    <span
                      key={label.name}
                      className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full"
                      style={getLabelColors(label.color)}
                    >
                      {label.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                    No labels
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
                </span>
                <span className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <MessageSquare size={14} className="mr-1" />
                  {issue.commentsCount}
                </span>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => onViewComments(issue)}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-full transition-colors"
                >
                  <MessageSquare size={18} />
                </button>
                <a
                  href={issue.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700/50 rounded-full transition-colors"
                >
                  <ExternalLink size={18} />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default IssueTable; 