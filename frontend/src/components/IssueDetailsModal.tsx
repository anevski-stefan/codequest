import { Fragment, useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, ArrowUpRight, Sparkles, CircleDot, CircleCheck, MessageSquare, FolderGit2, RotateCw, Settings } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatRelativeDate } from '../utils/formatDate';
import { getLabelColors } from '../features/dashboard/utils/filterUtils';
import { CommentsList } from './comments/CommentsList';
import { CommentForm } from './comments/CommentForm';
import { Skeleton } from './ui/Skeleton';
import ClaimBadge from './issues/ClaimBadge';
import useIssueClaims, { claimFor } from '../hooks/useIssueClaims';
import type { IssueClaim } from '../types/github';
import { useCommentSorting } from '../hooks/useCommentSorting';
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
  /** Hide the "Open repository" action when already on that repository. */
  hideRepoLink?: boolean;
}

const CLAIM_COPY: Record<string, { tone: string; hint: string }> = {
  free: { tone: 'border-green-500/20 bg-green-500/[0.05]', hint: 'Comment to claim it before you start, so nobody duplicates your work.' },
  requested: { tone: 'border-amber-400/20 bg-amber-400/[0.05]', hint: 'Someone asked first. Check whether a maintainer answered before you start.' },
  in_progress: { tone: 'border-blue-500/20 bg-blue-500/[0.05]', hint: 'Someone is already on it. Pick another issue, or offer to help on the PR.' },
  stale: { tone: 'border-white/[0.1] bg-white/[0.03]', hint: 'This looks abandoned. A polite check-in usually frees it up.' },
};

const claimRequest = () =>
  "Hi! I'd like to work on this issue. Could you assign it to me?\n\nMy plan: ";
const staleCheckIn = (who?: string) =>
  `Hi${who ? ` @${who}` : ''}, are you still working on this? If not, I'd be happy to pick it up.`;

function ClaimBanner({ claim, loading, onDraft }: { claim?: IssueClaim; loading: boolean; onDraft: (text: string) => void }) {
  if (loading && !claim) return <Skeleton className="h-[72px] w-full rounded-2xl" />;
  if (!claim || !CLAIM_COPY[claim.status]) return null;
  const copy = CLAIM_COPY[claim.status];
  return (
    <section aria-label="Claim status" className={`rounded-2xl border px-4 py-3.5 ${copy.tone}`}>
      <div className="flex items-start gap-3">
        <ClaimBadge claim={claim} size="md" describe={false} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-gray-100">{claim.reason}</p>
          <p className="text-[12px] text-gray-400 mt-0.5 leading-relaxed">{copy.hint}</p>
        </div>
        {claim.status === 'free' && (
          <button onClick={() => onDraft(claimRequest())}
            className="shrink-0 h-8 px-3 rounded-lg bg-white/[0.08] border border-white/[0.1] text-[12px] font-semibold text-white hover:bg-white/[0.12] active:scale-[0.97] transition-all cursor-pointer">
            Ask to work on it
          </button>
        )}
        {claim.status === 'stale' && (
          <button onClick={() => onDraft(staleCheckIn(claim.claimant))}
            className="shrink-0 h-8 px-3 rounded-lg bg-white/[0.08] border border-white/[0.1] text-[12px] font-semibold text-white hover:bg-white/[0.12] active:scale-[0.97] transition-all cursor-pointer">
            Draft a check-in
          </button>
        )}
        {claim.status === 'in_progress' && claim.pr && (
          <a href={claim.pr.url} target="_blank" rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-white/[0.08] border border-white/[0.1] text-[12px] font-semibold text-white hover:bg-white/[0.12] transition-colors">
            PR #{claim.pr.number}<ArrowUpRight className="w-3 h-3" />
          </a>
        )}
      </div>
    </section>
  );
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 mb-3">{children}</h3>
);

/**
 * Issue detail as a right-hand slide-over, so the list the user came from
 * stays in place behind it. Full-screen on phones.
 */
export default function IssueDetailsModal({
  isOpen, onClose, issue: issueProp, comments, isLoadingComments, hasMoreComments,
  isLoadingMore, onLoadMore, onAddComment, owner, repo, repoLanguage, repoDescription, hideRepoLink,
}: Props) {
  const sortedComments = useCommentSorting(comments);
  // Callers clear the issue on close; keep the last one so the exit
  // animation doesn't slide out an empty panel.
  const [lastIssue, setLastIssue] = useState<Issue | null>(issueProp);
  useEffect(() => { if (issueProp) setLastIssue(issueProp); }, [issueProp]);
  const issue = issueProp ?? lastIssue;
  const [explanation, setExplanation] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);

  const [draft, setDraft] = useState<{ text: string; n: number } | null>(null);
  const claimTarget = useMemo(() => (issue && issue.state === 'open' ? [issue] : []), [issue]);
  const { claims, loading: claimLoading } = useIssueClaims(claimTarget, isOpen);
  const claim = issue ? claimFor(claims, issue) : undefined;

  useEffect(() => {
    setDraft(null);
    setExplanation(''); setIsExplaining(false); setExplainError(null);
  }, [issue?.id]);

  // Fall back to the issue's own repository when the caller didn't pass one.
  const [issueOwner, issueRepo] = (issue?.repository?.fullName ?? '').split('/');
  const resolvedOwner = owner ?? issueOwner;
  const resolvedRepo = repo ?? issueRepo;

  const handleExplain = async () => {
    if (!issue || !resolvedOwner || !resolvedRepo) return;
    setIsExplaining(true); setExplainError(null); setExplanation('');
    await explainIssue({
      owner: resolvedOwner, repo: resolvedRepo,
      issueTitle: issue.title,
      issueBody: issue.body,
      comments: comments.map(c => ({ user: { login: c.user.login }, body: c.body })),
      repoLanguage, repoDescription,
      onChunk: t => setExplanation(prev => prev + t),
      onDone: () => setIsExplaining(false),
      onError: err => { setExplainError(err); setIsExplaining(false); },
    });
  };

  const isOpenState = issue?.state === 'open';
  const keyProblem = explainError && /key|api|provider|configure/i.test(explainError);

  return (
    <Transition show={isOpen && !!issue} as={Fragment} afterLeave={() => setLastIssue(null)}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild as={Fragment}
          enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-[#0f111a]/60 backdrop-blur-[2px]" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-y-0 right-0 flex max-w-full sm:pl-10">
            <TransitionChild as={Fragment}
              enter="transform transition ease-[cubic-bezier(0.16,1,0.3,1)] duration-500" enterFrom="translate-x-full" enterTo="translate-x-0"
              leave="transform transition ease-in duration-200" leaveFrom="translate-x-0" leaveTo="translate-x-full">
              <DialogPanel className="w-screen sm:max-w-[640px] h-[100dvh] flex flex-col bg-[#2A2E40] border-l border-white/[0.08] shadow-[-24px_0_64px_-16px_rgba(0,0,0,0.6)]">
                {issue && (
                  <>
                    {/* Top bar */}
                    <div className="h-14 shrink-0 flex items-center gap-2 px-4 sm:px-6 border-b border-white/[0.06]">
                      <span className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-md text-[11px] font-semibold border capitalize ${
                        isOpenState
                          ? 'text-green-300 bg-green-500/10 border-green-500/25'
                          : 'text-gray-400 bg-white/[0.05] border-white/[0.1]'
                      }`}>
                        {isOpenState ? <CircleDot className="w-3 h-3" /> : <CircleCheck className="w-3 h-3" />}
                        {issue.state}
                      </span>
                      <span className="text-[12px] font-mono text-gray-500 truncate">
                        {issue.repository.fullName}<span className="text-gray-600">#{issue.number}</span>
                      </span>
                      <div className="ml-auto flex items-center gap-1">
                        {!hideRepoLink && resolvedOwner && resolvedRepo && (
                          <Link
                            to={`/explore/${resolvedOwner}/${resolvedRepo}`}
                            onClick={onClose}
                            className="hidden sm:flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12px] font-semibold text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all"
                          >
                            <FolderGit2 className="w-3.5 h-3.5" />
                            Repository
                          </Link>
                        )}
                        <a href={issue.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12px] font-semibold text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all">
                          GitHub
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                        <button onClick={onClose} aria-label="Close"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto">
                      <div className="px-4 sm:px-6 pt-6 pb-8 space-y-8">
                        <header>
                          <DialogTitle className="text-xl font-bold text-white leading-snug tracking-tight">
                            {issue.title}
                          </DialogTitle>
                          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-gray-500">
                            <span className="flex items-center gap-1.5">
                              {issue.user.avatarUrl && (
                                <img src={issue.user.avatarUrl} alt="" width={18} height={18} className="w-[18px] h-[18px] rounded-full ring-1 ring-white/10" />
                              )}
                              <span className="text-gray-300 font-medium">{issue.user.login}</span>
                            </span>
                            <span>opened {formatRelativeDate(issue.createdAt)}</span>
                            <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{issue.commentsCount}</span>
                          </div>
                          {issue.labels.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-1.5">
                              {issue.labels.map(label => (
                                <span key={label.name} className="px-2 py-0.5 text-[11px] font-semibold rounded-md"
                                  style={getLabelColors(label.color)}>
                                  {label.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </header>

                        {issue.state === 'open' && (claim || claimLoading) && (
                          <ClaimBanner
                            claim={claim}
                            loading={claimLoading}
                            onDraft={text => setDraft(d => ({ text, n: (d?.n ?? 0) + 1 }))}
                          />
                        )}

                        {/* AI explanation — the primary action on this panel */}
                        {resolvedOwner && resolvedRepo && (
                          <section className="rounded-2xl border border-blue-500/20 bg-gradient-to-b from-blue-500/[0.07] to-blue-500/[0.02] overflow-hidden">
                            <div className="flex items-center gap-3 px-4 py-3.5">
                              <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
                                <Sparkles className="w-4 h-4 text-blue-300" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white">AI breakdown</p>
                                <p className="text-[12px] text-gray-400">What's wrong, where to look, and how hard it is.</p>
                              </div>
                              {!explanation && !isExplaining && (
                                <button
                                  onClick={handleExplain}
                                  className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-[13px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] active:scale-[0.97] transition-all cursor-pointer shrink-0"
                                >
                                  {explainError ? <RotateCw className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                                  {explainError ? 'Retry' : 'Explain'}
                                </button>
                              )}
                            </div>

                            {(isExplaining || explanation || explainError) && (
                              <div className="px-4 pb-4 border-t border-blue-500/10 pt-4">
                                {explainError ? (
                                  <div className="text-[13px]">
                                    <p className="text-red-300">{explainError}</p>
                                    {keyProblem && (
                                      <Link to="/settings" onClick={onClose} className="inline-flex items-center gap-1.5 mt-2 text-blue-300 hover:text-blue-200 font-semibold">
                                        <Settings className="w-3.5 h-3.5" /> Add an AI key in Settings
                                      </Link>
                                    )}
                                  </div>
                                ) : explanation ? (
                                  <div className="prose prose-sm prose-invert max-w-none text-[13px] leading-relaxed prose-p:text-gray-300 prose-li:text-gray-300 prose-strong:text-white prose-code:text-blue-200 prose-code:before:content-none prose-code:after:content-none">
                                    <ReactMarkdown>{explanation}</ReactMarkdown>
                                    {isExplaining && <span className="inline-block w-1.5 h-4 bg-blue-400 align-middle animate-pulse" />}
                                  </div>
                                ) : (
                                  <div className="space-y-2" role="status" aria-label="Generating explanation">
                                    <Skeleton className="h-3 w-full" />
                                    <Skeleton className="h-3 w-11/12" />
                                    <Skeleton className="h-3 w-3/4" />
                                  </div>
                                )}
                              </div>
                            )}
                          </section>
                        )}

                        <section>
                          <SectionLabel>Description</SectionLabel>
                          {issue.body ? (
                            <div className="prose prose-invert prose-sm max-w-none break-words leading-relaxed text-gray-300 prose-a:text-blue-300 prose-headings:text-white prose-headings:font-semibold prose-h1:text-base prose-h2:text-[15px] prose-h3:text-sm prose-code:text-blue-200 prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[#1D2030] prose-pre:border prose-pre:border-white/[0.06] prose-img:rounded-lg">
                              <ReactMarkdown>{issue.body}</ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-[13px] text-gray-500">The author didn't add a description.</p>
                          )}
                        </section>

                        <section>
                          <SectionLabel>Discussion · {issue.commentsCount}</SectionLabel>
                          {isLoadingComments ? (
                            <div className="space-y-3" role="status" aria-label="Loading comments">
                              {[0, 1].map(i => (
                                <div key={i} className="flex gap-3">
                                  <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                                  <div className="flex-1 space-y-2">
                                    <Skeleton className="h-3 w-24" />
                                    <Skeleton className="h-3 w-full" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <CommentsList
                              comments={sortedComments}
                              isLoading={false}
                              hasMoreComments={hasMoreComments}
                              isLoadingMore={isLoadingMore}
                              onLoadMore={onLoadMore}
                            />
                          )}
                        </section>
                      </div>
                    </div>

                    {/* Composer */}
                    <div className="shrink-0 px-4 sm:px-6 py-3.5 border-t border-white/[0.06] bg-[#262A3B] pb-[max(0.875rem,env(safe-area-inset-bottom))]">
                      <CommentForm key={draft?.n ?? 0} onSubmit={onAddComment} initialValue={draft?.text} autoFocus={!!draft} />
                    </div>
                  </>
                )}
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
