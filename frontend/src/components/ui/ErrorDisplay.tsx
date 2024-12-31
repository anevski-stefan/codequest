interface ErrorDisplayProps {
  error: string;
  title?: string;
}

export function ErrorDisplay({ error, title }: ErrorDisplayProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {title && (
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          {title}
        </h2>
      )}
      <div className="text-center text-red-600 dark:text-red-400">
        {error}
      </div>
    </div>
  );
} 