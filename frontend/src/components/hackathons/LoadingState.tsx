import LoadingSpinner from '../LoadingSpinner';

interface LoadingStateProps {
  title: string;
}

export function LoadingState({ title }: LoadingStateProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        {title}
      </h2>
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    </div>
  );
} 