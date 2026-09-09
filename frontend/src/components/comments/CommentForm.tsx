import { useState, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
interface CommentFormProps {
  onSubmit: (comment: string) => Promise<void>;
  disabled?: boolean;
}
export function CommentForm({
  onSubmit,
  disabled
}: CommentFormProps) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(comment);
      setComment('');
    } catch {
      // error feedback is surfaced by the calling component's toast
    } finally {
      setIsSubmitting(false);
    }
  }, [comment, onSubmit, isSubmitting]);
  return <form onSubmit={handleSubmit} className="flex gap-2">
      <input type="text" value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment…" className="flex-1 min-w-0 h-9 px-3 text-xs bg-[#111927] border border-white/[0.10] rounded-lg text-gray-300 placeholder-gray-700 focus:outline-none focus:border-blue-500/50 transition-all" disabled={isSubmitting || disabled} />
      <button type="submit" disabled={isSubmitting || disabled || !comment.trim()} className="w-9 h-9 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0">
        {isSubmitting ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Send className="w-3.5 h-3.5 text-white" />}
      </button>
    </form>;
}