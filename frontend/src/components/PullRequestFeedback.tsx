import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { Check, CircleCheck, CircleX, ExternalLink, ListChecks, RotateCw, Settings, Sparkles } from 'lucide-react';
import { explainCiFailure, getPullRequestFeedback } from '../services/github';
import { extractErrorMessage } from '../utils/extractErrorMessage';
import { ErrorDisplay } from './ui/ErrorDisplay';
import { Skeleton } from './ui/Skeleton';
import type { ReviewChecklistItem } from '../types/github';

interface Props {
  owner: string;
  repo: string;
  pullNumber: number;
  onNavigate: () => void;
}

const storageKey = (owner: string, repo: string, pullNumber: number) =>
  `codequest:pr-checklist:${owner}/${repo}#${pullNumber}`.toLowerCase();

const readDone = (key: string): Set<string> => {
  try {
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []);
  } catch {
    return new Set();
  }
};

const writeDone = (key: string, done: Set<string>) => {
  try {
    if (done.size) localStorage.setItem(key, JSON.stringify([...done]));
    else localStorage.removeItem(key);
  } catch {
    return;
  }
};

const markdownClass = 'prose prose-sm prose-invert max-w-none break-words text-[13px] leading-relaxed prose-p:text-gray-300 prose-p:my-1 prose-li:text-gray-300 prose-strong:text-white prose-a:text-blue-300 prose-code:text-blue-200 prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[#1D2030] prose-pre:border prose-pre:border-white/[0.06]';

function ChecklistItem({ item, done, onToggle }: { item: ReviewChecklistItem; done: boolean; onToggle: () => void }) {
  return (
    <li className="flex items-start gap-2 py-3 first:pt-1 last:pb-1">
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? 'Mark as not done' : 'Mark as done'}
        onClick={onToggle}
        className="group w-10 h-10 sm:w-9 sm:h-9 -ml-2 -mt-2 flex items-center justify-center shrink-0 cursor-pointer"
      >
        <span className={`w-[18px] h-[18px] rounded-md border flex items-center justify-center transition-colors ${
          done ? 'bg-blue-500 border-blue-500' : 'border-white/[0.2] group-hover:border-white/[0.35]'
        }`}>
          {done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </span>
      </button>
      <div className={`flex-1 min-w-0 transition-opacity ${done ? 'opacity-50' : ''}`}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-500">
          <span className="font-medium text-gray-400">{item.author}</span>
          {item.path && (
            <span className="font-mono text-gray-500 break-all">{item.path}{item.line ? `:${item.line}` : ''}</span>
          )}
          {item.outdated && (
            <span className="px-1.5 py-0.5 rounded-full border border-white/[0.1] text-[10px] text-gray-500">outdated</span>
          )}
        </div>
        <div className={markdownClass}>
          <ReactMarkdown>{item.body}</ReactMarkdown>
        </div>
        {item.url && (
          <a href={item.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-1 text-[11px] text-blue-400 hover:text-blue-300">
            View on GitHub <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </li>
  );
}

export default function PullRequestFeedback({ owner, repo, pullNumber, onNavigate }: Props) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['pr-feedback', owner, repo, pullNumber],
    queryFn: () => getPullRequestFeedback(owner, repo, pullNumber),
    staleTime: 60 * 1000,
    retry: false,
  });

  const key = storageKey(owner, repo, pullNumber);
  const [done, setDone] = useState<Set<string>>(() => readDone(key));

  const toggle = (id: string) => {
    setDone(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeDone(key, next);
      return next;
    });
  };

  const [summary, setSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<{ message: string; missingKey: boolean } | null>(null);

  const handleSummarize = async () => {
    setSummary(''); setSummaryError(null); setIsSummarizing(true);
    await explainCiFailure({
      owner, repo, pullNumber,
      onChunk: text => setSummary(prev => prev + text),
      onDone: () => setIsSummarizing(false),
      onError: (message, status) => { setSummaryError({ message, missingKey: status === 402 }); setIsSummarizing(false); },
    });
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2.5" role="status" aria-label="Loading review feedback">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay title="Couldn't load CI and review feedback" error={extractErrorMessage(error)} onRetry={() => refetch()} />;
  }

  if (!data) return null;
  const { failedChecks, review } = data;
  if (failedChecks.length === 0 && review.requestedBy.length === 0) {
    return (
      <p className="flex items-center gap-2 text-[13px] text-gray-400">
        <CircleCheck className="w-4 h-4 text-green-400 shrink-0" />
        No failing checks and no open change requests on the latest commit.
      </p>
    );
  }

  const doneCount = review.items.filter(i => done.has(i.id)).length;

  return (
    <div className="space-y-3">
      {failedChecks.length > 0 && (
        <section className="rounded-xl border border-red-500/20 bg-red-500/[0.04] overflow-hidden">
          <div className="flex flex-wrap items-start gap-3 px-4 py-3.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
              <CircleX className="w-4 h-4 text-red-400" />
            </div>
            <div className="flex-1 min-w-[12rem]">
              <p className="text-sm font-semibold text-white">CI is failing on the latest commit</p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {failedChecks.map(check => (
                  <li key={`${check.kind}-${check.id}`}>
                    {check.url ? (
                      <a href={check.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-red-500/20 text-[11px] font-mono text-red-300 hover:text-red-200 hover:border-red-500/35">
                        {check.name} <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full border border-red-500/20 text-[11px] font-mono text-red-300">{check.name}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            {!summary && !isSummarizing && (
              <button
                onClick={handleSummarize}
                className="flex items-center gap-1.5 h-10 sm:h-9 px-3.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-[13px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] active:scale-[0.97] transition-all cursor-pointer shrink-0"
              >
                {summaryError ? <RotateCw className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                {summaryError ? 'Retry' : 'Explain failure'}
              </button>
            )}
          </div>

          {(isSummarizing || summary || summaryError) && (
            <div className="px-4 pb-4 pt-3 border-t border-red-500/10">
              {summaryError ? (
                <div className="text-[13px]">
                  <p className="text-red-300">{summaryError.message}</p>
                  {summaryError.missingKey && (
                    <Link to="/settings" onClick={onNavigate} className="inline-flex items-center gap-1.5 mt-2 text-blue-300 hover:text-blue-200 font-semibold">
                      <Settings className="w-3.5 h-3.5" /> Add an AI key in Settings
                    </Link>
                  )}
                </div>
              ) : summary ? (
                <>
                  <p className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold uppercase tracking-wider text-blue-300">
                    <Sparkles className="w-3 h-3" /> AI summary of the check output
                  </p>
                  <div className={markdownClass}>
                    <ReactMarkdown>{summary}</ReactMarkdown>
                    {isSummarizing && <span className="inline-block w-1.5 h-4 bg-blue-400 align-middle animate-pulse" />}
                  </div>
                </>
              ) : (
                <div className="space-y-2" role="status" aria-label="Reading the check output">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-11/12" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {review.requestedBy.length > 0 && (
        <section className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03]">
          <div className="flex items-start gap-3 px-4 pt-3.5 pb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <ListChecks className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">
                Changes requested by {review.requestedBy.join(', ')}
              </p>
              <p className="text-[12px] text-gray-400">
                {review.items.length > 0
                  ? `${doneCount} of ${review.items.length} done · ticks are saved in this browser only`
                  : 'The review has no written comments.'}
              </p>
              {review.items.length === 0 && (
                <a href={`https://github.com/${owner}/${repo}/pull/${pullNumber}/files`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1.5 text-[12px] text-blue-400 hover:text-blue-300">
                  See the review on GitHub <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
          {review.items.length > 0 ? (
            <ul className="px-4 pb-3 divide-y divide-white/[0.05]">
              {review.items.map(item => (
                <ChecklistItem key={item.id} item={item} done={done.has(item.id)} onToggle={() => toggle(item.id)} />
              ))}
            </ul>
          ) : <div className="pb-2" />}
        </section>
      )}
    </div>
  );
}
