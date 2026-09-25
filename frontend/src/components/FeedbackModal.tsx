import { Fragment, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { motion } from 'framer-motion';
import { X, Bug, Lightbulb, MessageCircle, Send, AlertTriangle, CornerDownLeft } from 'lucide-react';
import { api } from '../services/github';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Kind = 'bug' | 'idea' | 'other';

const KINDS: { id: Kind; label: string; icon: typeof Bug; prompt: string; placeholder: string }[] = [
  {
    id: 'bug', label: 'Bug', icon: Bug,
    prompt: 'What went wrong?',
    placeholder: 'What did you do, what did you expect, and what happened instead?',
  },
  {
    id: 'idea', label: 'Idea', icon: Lightbulb,
    prompt: 'What would make Code Quest better?',
    placeholder: 'Describe the feature and the problem it would solve for you.',
  },
  {
    id: 'other', label: 'Other', icon: MessageCircle,
    prompt: "What's on your mind?",
    placeholder: 'Questions, praise, anything else.',
  },
];

// Backend limit (feedbackController MAX_MESSAGE_LENGTH) minus room for the context footer.
const MAX = 4800;
const DRAFT_KEY = 'feedback_draft';

const readDraft = () => {
  try { return localStorage.getItem(DRAFT_KEY) ?? ''; } catch { return ''; }
};
const writeDraft = (v: string) => {
  try { if (v) localStorage.setItem(DRAFT_KEY, v); else localStorage.removeItem(DRAFT_KEY); } catch { /* storage unavailable */ }
};

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const location = useLocation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [kind, setKind] = useState<Kind>('bug');
  const [message, setMessage] = useState(readDraft);
  const [includePage, setIncludePage] = useState(true);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const current = KINDS.find(k => k.id === kind)!;
  const trimmed = message.trim();
  const remaining = MAX - message.length;

  // Keep a draft so closing the dialog by accident doesn't lose the text.
  useEffect(() => { writeDraft(message); }, [message]);

  // Reset the success state after the dialog has closed.
  const handleAfterLeave = () => { if (status === 'success') setStatus('idle'); };

  // Auto-close shortly after a successful send.
  useEffect(() => {
    if (status !== 'success') return;
    const t = setTimeout(onClose, 2600);
    return () => clearTimeout(t);
  }, [status, onClose]);

  const submit = async () => {
    if (!trimmed || status === 'loading' || message.length > MAX) return;
    const body = [
      `[${current.label}] ${trimmed}`,
      includePage ? `\n\n— Page: ${location.pathname}${location.search}` : '',
    ].join('');
    try {
      setStatus('loading');
      await api.post('/api/feedback', { message: body });
      setMessage('');
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <Transition show={isOpen} as={Fragment} afterLeave={handleAfterLeave}>
      <Dialog as="div" className="relative z-50" onClose={onClose} initialFocus={textareaRef}>
        <TransitionChild as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-[#0f111a]/70 backdrop-blur-[2px]" aria-hidden="true" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-end sm:items-center justify-center sm:p-4">
          <TransitionChild as={Fragment}
            enter="ease-[cubic-bezier(0.16,1,0.3,1)] duration-300" enterFrom="opacity-0 translate-y-4 sm:translate-y-2 sm:scale-[0.98]" enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-150" leaveFrom="opacity-100 translate-y-0 sm:scale-100" leaveTo="opacity-0 translate-y-4 sm:translate-y-1 sm:scale-[0.98]">
            <DialogPanel className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-white/[0.09] bg-[#2E3245] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.07)] pb-[env(safe-area-inset-bottom)]">

              {status === 'success' ? (
                <div className="flex flex-col items-center text-center px-6 py-12" role="status">
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 400, damping: 18 } }}
                    className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/25 flex items-center justify-center"
                  >
                    <svg viewBox="0 0 24 24" className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.15 }} />
                    </svg>
                  </motion.div>
                  <DialogTitle className="mt-5 text-base font-semibold text-white">Thanks, we got it</DialogTitle>
                  <p className="mt-1.5 text-[13px] text-gray-400 max-w-xs leading-relaxed">
                    We read every message. If you reported a bug, it is now on the list.
                  </p>
                  <div className="mt-6 flex items-center gap-2">
                    <button onClick={() => { setStatus('idle'); requestAnimationFrame(() => textareaRef.current?.focus()); }}
                      className="h-9 px-3.5 rounded-lg text-[13px] font-semibold text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer">
                      Send another
                    </button>
                    <button onClick={onClose}
                      className="h-9 px-4 rounded-lg bg-white/[0.08] border border-white/[0.1] text-[13px] font-semibold text-white hover:bg-white/[0.12] transition-colors cursor-pointer">
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={e => { e.preventDefault(); submit(); }}>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5">
                    <div>
                      <DialogTitle className="text-base font-semibold text-white">Send feedback</DialogTitle>
                      <p className="text-[13px] text-gray-400 mt-0.5">Bugs, ideas, or anything else. It goes straight to the team.</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close"
                      className="-mr-1.5 -mt-0.5 w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="px-5 sm:px-6 pt-5 pb-5 space-y-4">
                    {/* Kind */}
                    <div role="radiogroup" aria-label="Feedback type" className="grid grid-cols-3 gap-2">
                      {KINDS.map(k => {
                        const active = kind === k.id;
                        return (
                          <button
                            key={k.id}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => { setKind(k.id); textareaRef.current?.focus(); }}
                            className={`relative flex flex-col items-center gap-1.5 py-3 rounded-xl border text-[12px] font-semibold transition-colors cursor-pointer ${
                              active ? 'border-blue-500/45 text-white' : 'border-white/[0.08] text-gray-400 hover:text-gray-200 hover:border-white/[0.15]'
                            }`}
                          >
                            {active && (
                              <motion.span layoutId="feedback-kind" className="absolute inset-0 rounded-xl bg-blue-500/[0.08]"
                                transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
                            )}
                            <k.icon className={`relative w-4 h-4 ${active ? 'text-blue-300' : ''}`} />
                            <span className="relative">{k.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Message */}
                    <div className="space-y-2">
                      <label htmlFor="feedback-message" className="block text-[13px] font-semibold text-gray-200">{current.prompt}</label>
                      <textarea
                        ref={textareaRef}
                        id="feedback-message"
                        value={message}
                        onChange={e => { setMessage(e.target.value); if (status === 'error') setStatus('idle'); }}
                        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); } }}
                        rows={5}
                        maxLength={MAX + 200}
                        placeholder={current.placeholder}
                        aria-describedby="feedback-help"
                        aria-invalid={remaining < 0}
                        className="w-full min-h-[128px] max-h-[40vh] rounded-xl bg-[#252836] border border-white/[0.09] text-[14px] text-gray-100 placeholder-gray-500 px-3.5 py-3 resize-y focus:outline-none focus-visible:outline-none focus:border-blue-500/50 focus:shadow-[0_0_0_3px_rgba(59,123,255,0.12)] transition-all leading-relaxed"
                      />
                      <div id="feedback-help" className="flex items-center justify-between gap-3 text-[11px]">
                        <label className="flex items-center gap-2 text-gray-400 cursor-pointer select-none">
                          <input type="checkbox" checked={includePage} onChange={e => setIncludePage(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-white/20 bg-[#252836] accent-blue-500 cursor-pointer" />
                          Include current page <code className="text-gray-500 font-mono truncate max-w-[140px]">{location.pathname}</code>
                        </label>
                        <span className={`tabular shrink-0 ${remaining < 0 ? 'text-red-400 font-semibold' : remaining < 300 ? 'text-amber-300' : 'text-gray-600'}`}>
                          {remaining < 300 ? `${remaining} left` : message.length > 0 ? `${message.length}` : ''}
                        </span>
                      </div>
                    </div>

                    {status === 'error' && (
                      <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3.5 py-2.5 text-[13px]">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-red-200">Couldn't send it. Your message is still here, so try again in a moment.</p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3.5 border-t border-white/[0.06] bg-[#2A2E40] rounded-b-none sm:rounded-b-2xl">
                    <p className="hidden sm:flex items-center gap-1.5 text-[11px] text-gray-500">
                      <span className="kbd">{isMac ? '⌘' : 'Ctrl'}</span><span className="kbd"><CornerDownLeft className="w-2.5 h-2.5" /></span>to send
                    </p>
                    <div className="flex items-center gap-2 ml-auto">
                      <button type="button" onClick={onClose}
                        className="h-9 px-3.5 rounded-lg text-[13px] font-semibold text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer">
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!trimmed || status === 'loading' || remaining < 0}
                        className="flex items-center gap-2 h-9 px-4 rounded-lg bg-blue-500 hover:bg-blue-400 text-[13px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 transition-all cursor-pointer"
                      >
                        {status === 'loading'
                          ? <span className="w-3.5 h-3.5 rounded-full border-[1.5px] border-white/30 border-t-white animate-spin" />
                          : status === 'error' ? null : <Send className="w-3.5 h-3.5" />}
                        {status === 'loading' ? 'Sending' : status === 'error' ? 'Try again' : 'Send feedback'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
