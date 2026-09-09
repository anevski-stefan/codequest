import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { X, MessageSquare, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../services/github';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    try {
      setStatus('loading');
      setErrorMessage('');
      await api.post('/api/feedback', { message });
      setStatus('success');
      setMessage('');
      setTimeout(() => { onClose(); setStatus('idle'); }, 2000);
    } catch {
      setStatus('error');
      setErrorMessage('Failed to send feedback. Please try again.');
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="relative w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0D1525] shadow-2xl shadow-black/50">

          {/* Close */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/[0.05] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="px-6 pt-6 pb-5 border-b border-white/[0.05]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <Dialog.Title className="text-sm font-semibold text-white">Send Feedback</Dialog.Title>
                <p className="text-xs text-gray-600 mt-0.5">Your thoughts help us improve Code Quest</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            {status === 'success' ? (
              <div className="flex flex-col items-center justify-center py-6 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-white">Thanks for the feedback!</p>
                  <p className="text-xs text-gray-600 mt-1">We read every message carefully.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <label htmlFor="feedback-message" className="block text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-2">
                  Your message
                </label>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={5}
                  placeholder="What's on your mind? Bug reports, feature ideas, or anything else…"
                  required
                  className="w-full rounded-xl bg-[#111927] border border-white/[0.08] text-sm text-gray-300 placeholder-gray-700 p-4 resize-none focus:outline-none focus:border-blue-500/50 transition-all leading-relaxed"
                />

                {status === 'error' && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-red-400">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errorMessage}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-200 hover:bg-white/[0.05] transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={status === 'loading' || !message.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    {status === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {status === 'loading' ? 'Sending…' : 'Send Feedback'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
