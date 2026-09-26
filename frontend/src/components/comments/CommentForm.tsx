import { useState, useCallback, useEffect, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface CommentFormProps {
  onSubmit: (comment: string) => Promise<void>;
  disabled?: boolean;
  /** Pre-filled draft (e.g. a claim request). Remount with a new key to replace it. */
  initialValue?: string;
  autoFocus?: boolean;
}

const MAX_ROWS_PX = 160;

export function CommentForm({ onSubmit, disabled, initialValue = '', autoFocus }: CommentFormProps) {
  const [comment, setComment] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Grow with the content up to a cap, then scroll.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_ROWS_PX)}px`;
  }, [comment]);

  useEffect(() => {
    if (!autoFocus || !ref.current) return;
    const el = ref.current;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [autoFocus]);

  const submit = useCallback(async () => {
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

  return (
    <form onSubmit={e => { e.preventDefault(); submit(); }} className="flex items-end gap-2">
      <textarea
        ref={ref}
        rows={1}
        value={comment}
        onChange={e => setComment(e.target.value)}
        onKeyDown={e => {
          // Enter sends, Shift+Enter adds a line (chat convention).
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); }
        }}
        placeholder="Write a comment"
        aria-label="Write a comment"
        className="flex-1 min-w-0 min-h-10 px-3.5 py-2.5 text-[13px] leading-5 bg-[#363B52] border border-white/[0.10] rounded-xl text-gray-100 placeholder-gray-500 resize-none focus:outline-none focus-visible:outline-none focus:border-blue-500/50 focus:shadow-[0_0_0_3px_rgba(59,123,255,0.12)] transition-[border-color,box-shadow]"
        disabled={isSubmitting || disabled}
      />
      <button
        type="submit"
        disabled={isSubmitting || disabled || !comment.trim()}
        aria-label="Post comment"
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-500 hover:bg-blue-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
      >
        {isSubmitting ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Send className="w-3.5 h-3.5 text-white" />}
      </button>
    </form>
  );
}
