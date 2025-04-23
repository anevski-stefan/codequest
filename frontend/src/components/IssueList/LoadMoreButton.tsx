import { LoadMoreButtonProps } from './types';

export const LoadMoreButton = ({ onClick }: LoadMoreButtonProps) => (
  <div className="flex justify-center mt-6">
    <button
      onClick={onClick}
      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
    >
      Load More
    </button>
  </div>
); 