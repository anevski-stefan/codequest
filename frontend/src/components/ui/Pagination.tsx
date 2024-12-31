interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  return (
    <div className="mt-8 flex justify-center gap-2">
      <button
        onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 
          bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 
          rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 
          disabled:cursor-not-allowed"
      >
        Previous
      </button>
      <span className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 
          bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 
          rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 
          disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  );
} 