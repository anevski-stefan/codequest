import { AlertTriangle, RotateCw } from 'lucide-react';

interface ErrorDisplayProps {
  title?: string;
  error: string;
  className?: string;
  onRetry?: () => void;
}

export function ErrorDisplay({ title = 'Something went wrong', error, className = '', onRetry }: ErrorDisplayProps) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${className}`}
    >
      <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
        <AlertTriangle className="w-4 h-4 text-red-400" />
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <h3 className="text-sm font-semibold text-red-300">{title}</h3>
        <p className="text-[13px] text-gray-400 mt-0.5 break-words">{error}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-white/[0.1] bg-white/[0.04] text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/[0.08] active:scale-[0.97] transition-all cursor-pointer shrink-0"
        >
          <RotateCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}
