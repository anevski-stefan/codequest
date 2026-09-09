import { Fragment, useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, ExternalLink, Sparkles, ChevronDown, ChevronUp, CircleDot, Send, Loader2, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatRelativeDate } from '../utils/formatDate';
import { getLabelColors } from '../features/dashboard/utils/filterUtils';
import { CommentsList } from './comments/CommentsList';
import { explainIssue } from '../services/github';
import type { Issue } from '../types/github';
import type { Comment } from '../types/comments';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  issue: Issue | null;
  comments: Comment[];
  isLoadingComments: boolean;
  hasMoreComments: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onAddComment: (comment: string) => Promise<void>;
  owner?: string;
  repo?: string;
  repoLanguage?: string | null;
  repoDescription?: string;
}

function InlineCommentForm({ onSubmit }: { onSubmit: (c: string) => Promise<void> }) {
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || submitting) return;
    setSubmitting(true);
    try { await onSubmit(comment); setComment(''); } catch { /* toast handles it */ } finally { setSubmitting(false); }
  };
  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Add a comment…"
        disabled={submitting}
        className="flex-1 min-w-0 h-9 px-3 text-xs bg-[#111927] border border-white/[0.10] rounded-lg text-gray-300 placeholder-gray-700 focus:outline-none focus:border-blue-500/50 transition-all"
      />
      <button
        type="submit"
        disabled={submitting || !comment.trim()}
        className="w-9 h-9 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
      >
        {submitting ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Send className="w-3.5 h-3.5 text-white" />}
      </button>
    </form>
  );
}

export default function IssueDetailsModal({
  isOpen, onClose, issue, comments, isLoadingComments, hasMoreComments,
  isLoadingMore, onLoadMore, onAddComment, owner, repo, repoLanguage, repoDescription,
}: Props) {
  const [explanation, setExplanation] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    setExplanation(''); setIsExplaining(false); setExplainError(null); setShowExplanation(false);
  }, [issue?.id]);

  const handleExplain = async () => {
    if (!issue || !owner || !repo) return;
    setIsExplaining(true); setExplainError(null); setExplanation(''); setShowExplanation(true);
    await explainIssue({
      owner, repo,
      issueTitle: issue.title,
      issueBody: issue.body,
      comments: comments.map(c => ({ user: { login: c.user.login }, body: c.body })),
      repoLanguage, repoDescription,
      onChunk: t => setExplanation(prev => prev + t),
      onDone: () => setIsExplaining(false),
      onError: err => { setExplainError(err); setIsExplaining(false); },
    });
  };

  if (!issue) return null;

  const isOpen_ = issue.state === 'open';

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 z-10 flex items-center justify-center p-4">
          <TransitionChild as={Fragment}
            enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
            leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
            <DialogPanel className="relative w-full max-w-3xl max-h-[88vh] flex flex-col rounded-2xl border border-white/[0.08] bg-[#0D1525] shadow-2xl shadow-black/60">

              {/* Header */}
              <div className="px-6 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        isOpen_
                          ? 'text-green-400 bg-green-500/10 border-green-500/20'
                          : 'text-violet-400 bg-violet-500/10 border-violet-500/20'
                      }`}>
                        <CircleDot className="w-3 h-3" />
                        {issue.state}
                      </span>
                      <span className="text-xs text-gray-600">#{issue.number}</span>
                    </div>
                    <DialogTitle className="text-base font-bold text-white leading-snug">
                      {issue.title}
                    </DialogTitle>
                    <p className="mt-1.5 text-xs text-gray-600">
                      <span className="text-blue-400">{issue.repository.fullName}</span>
                      {' · '}opened {formatRelativeDate(issue.createdAt)} by{' '}
                      <span className="text-gray-400 font-medium">{issue.user.login}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {owner && repo && (
                      <button
                        onClick={handleExplain}
                        disabled={isExplaining}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-violet-500/30 bg-violet-500/[0.08] text-violet-400 hover:bg-violet-500/[0.14] disabled:opacity-50 transition-all cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {isExplaining ? 'Explaining…' : 'Explain'}
                      </button>
                    )}
                    <a href={issue.url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/[0.05] transition-all">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button onClick={onClose}
                      className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/[0.05] transition-all cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                {/* Labels */}
                {issue.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {issue.labels.map(label => (
                      <span key={label.name} className="px-2 py-0.5 text-[10px] font-medium rounded-full"
                        style={getLabelColors(label.color)}>
                        {label.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Issue body */}
                {issue.body ? (
                  <div className="text-sm text-gray-400 whitespace-pre-wrap break-words leading-relaxed rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    {issue.body}
                  </div>
                ) : (
                  <p className="text-xs text-gray-700 italic">No description provided.</p>
                )}

                {/* AI Explanation */}
                {showExplanation && (
                  <div className="rounded-xl border border-violet-500/20 overflow-hidden">
                    <button
                      onClick={() => setShowExplanation(v => !v)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-violet-500/[0.06] hover:bg-violet-500/[0.10] text-xs font-semibold text-violet-400 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Explanation
                      </span>
                      {showExplanation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <div className="px-4 py-4 bg-[#0B1020]">
                      {explainError ? (
                        <p className="text-xs text-red-400">{explainError}</p>
                      ) : explanation ? (
                        <div className="prose prose-sm prose-invert max-w-none text-xs leading-relaxed">
                          <ReactMarkdown>{explanation}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 py-1 text-xs text-gray-600">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Thinking…
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Comments */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-3.5 h-3.5 text-gray-700" />
                    <h3 className="text-[10px] font-semibold text-gray-700 uppercase tracking-widest">
                      Comments ({issue.commentsCount})
                    </h3>
                  </div>

                  {isLoadingComments ? (
                    <div className="flex items-center gap-2 py-6 text-xs text-gray-700">
                      <Loader2 className="w-4 h-4 animate-spin" />Loading…
                    </div>
                  ) : (
                    <CommentsList
                      comments={comments}
                      isLoading={false}
                      hasMoreComments={hasMoreComments}
                      isLoadingMore={isLoadingMore}
                      onLoadMore={onLoadMore}
                    />
                  )}
                </div>
              </div>

              {/* Comment form */}
              <div className="px-6 py-4 border-t border-white/[0.06] shrink-0">
                <InlineCommentForm onSubmit={onAddComment} />
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
