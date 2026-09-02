import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages?: number;
  hasMore?: boolean;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  hasMore,
  onPageChange
}: PaginationProps) {
  const canGoNext = totalPages !== undefined ? currentPage < totalPages : !!hasMore;

  return (
    <div className="mt-8 flex justify-center items-center gap-4">
      <button
        onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
          currentPage === 1
            ? 'text-gray-400 border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50 cursor-not-allowed'
            : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50 dark:text-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700'
        }`}
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Previous</span>
      </button>

      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
        Page {currentPage} {totalPages ? `of ${totalPages}` : ''}
      </span>

      <button
        onClick={() => canGoNext && onPageChange(currentPage + 1)}
        disabled={!canGoNext}
        className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
          !canGoNext
            ? 'text-gray-400 border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50 cursor-not-allowed'
            : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50 dark:text-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700'
        }`}
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}