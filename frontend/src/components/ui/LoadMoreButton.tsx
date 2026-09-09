import { Loader2 } from 'lucide-react';

interface LoadMoreButtonProps {
  onClick: () => void;
  isLoading: boolean;
}

const LoadMoreButton = ({ onClick, isLoading }: LoadMoreButtonProps) => (
  <div className="flex justify-center py-5 border-t border-white/[0.04]">
    <button
      onClick={onClick}
      disabled={isLoading}
      className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm text-gray-400 border border-white/[0.08] hover:border-white/[0.15] hover:text-white disabled:opacity-40 transition-all cursor-pointer"
    >
      {isLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading…</> : 'Load more'}
    </button>
  </div>
);

export default LoadMoreButton;
