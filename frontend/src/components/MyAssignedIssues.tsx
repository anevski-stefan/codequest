import { useState } from 'react';
import { useQuery } from 'react-query';
import { getAssignedIssues, getIssueComments, addIssueComment } from '../services/github';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle } from 'lucide-react';
import type { Issue } from '../types/github';
import CommentsModal, { Comment as ModalComment } from './CommentsModal';

const getLabelColors = (color: string) => {
  // Convert hex to RGB to check brightness
  const r = parseInt(color.slice(0, 2), 16);
  const g = parseInt(color.slice(2, 4), 16);
  const b = parseInt(color.slice(4, 6), 16);
  
  // Calculate perceived brightness using YIQ formula
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  
  return {
    backgroundColor: `#${color}`,
    color: yiq >= 128 ? '#000000' : '#ffffff'  // Use black text for light backgrounds, white for dark
  };
};

const MyAssignedIssues = () => {
  const [issueState, setIssueState] = useState<string>('open');
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);
  const [comments, setComments] = useState<ModalComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const { data, isLoading, error } = useQuery(
    ['assignedIssues', issueState],
    () => getAssignedIssues(issueState),
    {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    }
  );

  const handleOpenComments = async (issueNumber: number, repoFullName: string) => {
    setSelectedIssueId(issueNumber);
    setIsCommentsModalOpen(true);
    setIsLoadingComments(true);
    try {
      const response = await getIssueComments(issueNumber, repoFullName);
      setComments(response.comments || []);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleAddComment = async (comment: string) => {
    const issue = data?.issues.find((i: Issue) => i.number === selectedIssueId);
    if (issue && selectedIssueId) {
      try {
        await addIssueComment(selectedIssueId, issue.repository.fullName, comment);
        const response = await getIssueComments(selectedIssueId, issue.repository.fullName);
        setComments(response.comments || []);
      } catch (error) {
        console.error('Failed to add comment:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="w-full flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full text-center text-red-600 p-4">
        {error instanceof Error ? error.message : 'Failed to load assigned issues'}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h1 className="text-2xl font-semibold text-gray-900">My Assigned Issues</h1>
          <select
            value={issueState}
            onChange={(e) => setIssueState(e.target.value)}
            className="px-3 py-1.5 text-sm border rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {data?.issues && data.issues.length > 0 ? (
          <div className="bg-white rounded-lg border shadow-sm divide-y divide-gray-100">
            {data.issues.map((issue: Issue) => (
              <div key={issue.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col gap-3">
                  {/* Title and Repository */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <a 
                        href={issue.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-base font-medium text-gray-900 hover:text-blue-600"
                      >
                        {issue.title}
                      </a>
                      <p className="mt-0.5 text-sm text-gray-500">
                        {issue.repository?.fullName} #{issue.number}
                      </p>
                    </div>
                    
                    {/* Labels */}
                    <div className="flex flex-wrap gap-1.5 ml-4">
                      {issue.labels.map((label) => (
                        <span
                          key={label.name}
                          className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full whitespace-nowrap"
                          style={getLabelColors(label.color)}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Metadata and Actions */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4 text-gray-500">
                      <span className="inline-flex items-center">
                        <span className={`w-2 h-2 rounded-full mr-2 ${
                          issue.state === 'open' ? 'bg-green-500' : 'bg-purple-500'
                        }`} />
                        {issue.state}
                      </span>
                      <span>•</span>
                      <span>
                        Updated {formatDistanceToNow(new Date(issue.updatedAt), { addSuffix: true })}
                      </span>
                      <span>•</span>
                      <span>
                        {issue.commentsCount} comments
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleOpenComments(issue.number, issue.repository.fullName)}
                        className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <MessageCircle size={14} className="mr-1.5" />
                        View Comments
                      </button>
                      <a 
                        href={issue.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        View on GitHub
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border rounded-lg p-8 text-center">
            <p className="text-gray-500">
              No {issueState} issues assigned to you
            </p>
          </div>
        )}

        {selectedIssueId && (
          <CommentsModal
            isOpen={isCommentsModalOpen}
            onClose={() => {
              setIsCommentsModalOpen(false);
              setSelectedIssueId(null);
              setComments([]);
            }}
            comments={comments}
            isLoading={isLoadingComments}
            onAddComment={handleAddComment}
            onLoadMore={() => {}}
            hasMoreComments={false}
            isLoadingMore={false}
          />
        )}
      </div>
    </div>
  );
};

export default MyAssignedIssues; 