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
      <input type="text" value={comment} onChange={e => setComment(e.target.value)} placeholder="Write a comment" aria-label="Write a comment" className="flex-1 min-w-0 h-10 px-3.5 text-[13px] bg-[#363B52] border border-white/[0.10] rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus-visible:outline-none focus:border-blue-500/50 focus:shadow-[0_0_0_3px_rgba(59,123,255,0.12)] transition-all" disabled={isSubmitting || disabled} />
      <button type="submit" disabled={isSubmitting || disabled || !comment.trim()} aria-label="Post comment" className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-500 hover:bg-blue-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0">
        {isSubmitting ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Send className="w-3.5 h-3.5 text-white" />}
      </button>
    </form>;
}