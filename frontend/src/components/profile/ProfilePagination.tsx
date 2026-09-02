import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ProfilePaginationProps {
  page: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
}

const ProfilePagination = ({ page, hasMore, onPageChange }: ProfilePaginationProps) => (
  <div className="mt-6 flex items-center justify-center gap-4">
    <button
      onClick={() => onPageChange(Math.max(1, page - 1))}
      disabled={page === 1}
      className={`p-2 rounded-lg ${page === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
    >
      <ChevronLeft className="w-5 h-5" />
    </button>
    <span className="text-sm text-gray-600 dark:text-gray-300">
      Page {page}
    </span>
    <button
      onClick={() => onPageChange(page + 1)}
      disabled={!hasMore}
      className={`p-2 rounded-lg ${!hasMore ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
    >
      <ChevronRight className="w-5 h-5" />
    </button>
  </div>
);

export default ProfilePagination;
