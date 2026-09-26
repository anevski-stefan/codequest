import { ChevronDown } from 'lucide-react';

interface LoadMoreButtonProps {
  onClick: () => void;
  isLoading: boolean;
}

const LoadMoreButton = ({ onClick, isLoading }: LoadMoreButtonProps) => (
  <div className="flex justify-center py-6">
    <button
      onClick={onClick}
      disabled={isLoading}
      className="group flex items-center gap-2 h-9 px-4 rounded-full text-xs font-semibold text-gray-300 border border-white/[0.09] bg-[#2E3245] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-white/[0.18] hover:text-white disabled:opacity-60 disabled:cursor-wait active:scale-[0.97] transition-all cursor-pointer"
    >
      {isLoading ? (
        <>
          <span className="h-3.5 w-3.5 rounded-full border-[1.5px] border-white/15 border-t-blue-400 animate-spin" />
          Loading
        </>
      ) : (
        <>
          Load more
          <ChevronDown className="h-3.5 w-3.5 text-gray-500 group-hover:text-gray-300 group-hover:translate-y-0.5 transition-all" />
        </>
      )}
    </button>
  </div>
);

export default LoadMoreButton;
