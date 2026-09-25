import { Dialog, DialogPanel, TransitionChild, Transition } from '@headlessui/react';
import { Fragment, useState, useMemo, useCallback } from 'react';
import { formatRelativeDate } from '../utils/formatDate';
import { X, GitCommit, FileText, ChevronDown, ChevronUp, GitPullRequest, Loader2 } from 'lucide-react';

import type { PullRequestDetails } from '../types/github';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  pullRequestDetails?: PullRequestDetails;
  isLoading: boolean;
}

type TabType = 'commits' | 'changes';

function statusStyle(status: string) {
  switch (status) {
    case 'added':    return 'text-green-400 bg-green-500/10 border-green-500/20';
    case 'removed':  return 'text-red-400 bg-red-500/10 border-red-500/20';
    case 'modified': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    case 'renamed':  return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    default:         return 'text-gray-400 bg-white/[0.05] border-white/[0.10]';
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'added':    return 'new file';
    case 'removed':  return 'removed';
    case 'modified': return 'modified';
    case 'renamed':  return 'renamed';
    default:         return status;
  }
}

export default function PullRequestDetailsModal({ isOpen, onClose, pullRequestDetails, isLoading }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('changes');
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [selectedCommitSha, setSelectedCommitSha] = useState<string | null>(null);

  const toggleFile = useCallback((filename: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      next.has(filename) ? next.delete(filename) : next.add(filename);
      return next;
    });
  }, []);

  const handleCommitClick = useCallback((sha: string) => {
    const commit = pullRequestDetails?.commits_data?.find(c => c.sha === sha);
    if (commit) { setSelectedCommitSha(sha); setActiveTab('changes'); setExpandedFiles(new Set(commit.files)); }
  }, [pullRequestDetails]);

  const formatDate = useCallback((d?: string) => formatRelativeDate(d), []);

  const pr = pullRequestDetails;
  const isMerged = !!pr?.merged_at;

  const tabContent = useMemo(() => {
    if (isLoading) return (
      <div className="flex items-center justify-center py-16 gap-2 text-xs text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />Loading…
      </div>
    );

    if (activeTab === 'commits') return (
      <div className="space-y-2">
        {pr?.commits_data?.map(commit => {
          const selected = commit.sha === selectedCommitSha;
          return (
            <button key={commit.sha} onClick={() => handleCommitClick(commit.sha)}
              className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                selected
                  ? 'bg-blue-500/[0.08] border-blue-500/25'
                  : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.10]'
              }`}>
              {commit.author?.avatar_url
                ? <img src={commit.author.avatar_url} alt={commit.author.login} width={28} height={28} loading="lazy" className="w-7 h-7 rounded-full ring-1 ring-white/[0.08] shrink-0 mt-0.5" />
                : <div className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5"><GitCommit className="w-3.5 h-3.5 text-gray-600" /></div>
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs font-medium text-gray-200 truncate leading-snug">{commit.commit.message.split('\n')[0]}</span>
                  <span className="text-[10px] text-gray-500 whitespace-nowrap shrink-0">{formatDate(commit.commit.author.date)}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-500">
                  <span className="font-mono text-gray-600">{commit.sha.substring(0, 7)}</span>
                  <span>·</span>
                  <span className="text-gray-500">{commit.author?.login || commit.commit.author.name}</span>
                </div>
                {commit.commit.message.includes('\n') && (
                  <p className="mt-1.5 text-[10px] text-gray-600 whitespace-pre-wrap">
                    {commit.commit.message.split('\n').slice(1).join('\n').trim()}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );

    // changes tab
    return pr?.files?.length ? (
      <div className="space-y-2">
        {selectedCommitSha && (
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-blue-500/20 bg-blue-500/[0.06] mb-3">
            <span className="text-xs text-blue-400">Showing commit <span className="font-mono">{selectedCommitSha.substring(0, 7)}</span></span>
            <button onClick={() => { setSelectedCommitSha(null); setExpandedFiles(new Set()); }} className="p-0.5 text-blue-500 hover:text-blue-300 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {pr.files.map(file => {
          const isExpanded = expandedFiles.has(file.filename);
          return (
            <div key={file.filename} className="rounded-xl border border-white/[0.06] overflow-hidden">
              <button onClick={() => toggleFile(file.filename)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-xs text-gray-300 truncate">{file.filename}</span>
                  <span className={`shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded-full border ${statusStyle(file.status)}`}>
                    {statusLabel(file.status)}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className="text-[11px] font-medium text-green-400">+{file.additions}</span>
                  <span className="text-[11px] font-medium text-red-400">-{file.deletions}</span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-600" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-600" />}
                </div>
              </button>
              {isExpanded && file.patch && (
                <div className="border-t border-white/[0.05] overflow-x-auto bg-[#252836]">
                  <pre className="text-[11px] font-mono leading-5 p-3">
                    {file.patch.split('\n').map((line, i) => {
                      if (line.startsWith('@@')) {
                        const m = line.match(/@@ -(\d+),?(\d+)? \+(\d+),?(\d+)? @@(.*)$/);
                        return (
                          <div key={i} className="px-2 py-0.5 my-1 rounded bg-blue-500/[0.07] text-blue-400/80 text-[10px]">
                            {m ? `Lines ${m[1]}–${Number(m[1])+Number(m[2]||1)} → ${m[3]}–${Number(m[3])+Number(m[4]||1)}${m[5] ? ' · '+m[5] : ''}` : line}
                          </div>
                        );
                      }
                      return (
                        <div key={i} className={`px-2 rounded ${
                          line.startsWith('+') ? 'bg-green-500/[0.08] text-green-300'
                          : line.startsWith('-') ? 'bg-red-500/[0.08] text-red-300'
                          : 'text-gray-500'
                        }`}>{line || ' '}</div>
                      );
                    })}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    ) : null;
  }, [activeTab, isLoading, pr, expandedFiles, toggleFile, selectedCommitSha, formatDate, handleCommitClick]);

  if (!isOpen) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-[#0f111a]/60 backdrop-blur-[2px]" />
        </TransitionChild>

        {/* Same right-hand slide-over as the issue panel, wider for diffs */}
        <div className="fixed inset-y-0 right-0 flex max-w-full sm:pl-10">
          <TransitionChild as={Fragment}
            enter="transform transition ease-[cubic-bezier(0.16,1,0.3,1)] duration-500" enterFrom="translate-x-full" enterTo="translate-x-0"
            leave="transform transition ease-in duration-200" leaveFrom="translate-x-0" leaveTo="translate-x-full">
            <DialogPanel className="w-screen sm:max-w-[880px] h-[100dvh] flex flex-col bg-[#2A2E40] border-l border-white/[0.08] shadow-[-24px_0_64px_-16px_rgba(0,0,0,0.6)]">

              {/* Header */}
              <div className="px-6 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
                {isLoading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/[0.05] animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-4 w-48 bg-white/[0.05] rounded animate-pulse" />
                      <div className="h-3 w-32 bg-white/[0.04] rounded animate-pulse" />
                    </div>
                  </div>
                ) : pr ? (
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          isMerged
                            ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                            : pr.state === 'open'
                              ? 'text-green-400 bg-green-500/10 border-green-500/20'
                              : 'text-red-400 bg-red-500/10 border-red-500/20'
                        }`}>
                          <GitPullRequest className="w-3 h-3" />
                          {isMerged ? 'merged' : pr.state}
                        </span>
                        <span className="text-xs text-gray-600">#{pr.number}</span>
                      </div>
                      <h2 className="text-base font-bold text-white leading-snug">{pr.title}</h2>
                      <p className="mt-1 text-xs text-gray-600">
                        opened by <span className="text-gray-400 font-medium">{pr.user.login}</span>
                        {' '}{formatDate(pr.created_at)}
                        {pr.additions !== undefined && (
                          <> · <span className="text-green-400">+{pr.additions}</span>{' '}<span className="text-red-400">-{pr.deletions}</span></>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {pr.user.avatar_url && (
                        <img src={pr.user.avatar_url} alt={pr.user.login} width={28} height={28} loading="lazy" className="w-7 h-7 rounded-full ring-1 ring-white/[0.08]" />
                      )}
                      <button onClick={onClose} className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/[0.05] transition-all cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-red-400">Error loading pull request</p>
                )}
              </div>

              {/* Tabs */}
              <div className="px-6 border-b border-white/[0.06] shrink-0">
                <nav className="flex gap-1 -mb-px">
                  {([
                    { id: 'changes' as TabType, icon: FileText, label: `${pr?.changed_files ?? '–'} changed files` },
                    { id: 'commits' as TabType, icon: GitCommit, label: `${pr?.commits ?? '–'} commits` },
                  ] as const).map(({ id, icon: Icon, label }) => (
                    <button key={id} onClick={() => setActiveTab(id)}
                      className={`flex items-center gap-1.5 px-3 py-3.5 text-xs font-medium border-b-2 transition-all cursor-pointer ${
                        activeTab === id
                          ? 'border-blue-500 text-blue-400'
                          : 'border-transparent text-gray-600 hover:text-gray-400 hover:border-white/[0.10]'
                      }`}>
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5">
                {tabContent}
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
