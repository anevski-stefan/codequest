import { AlertCircle } from 'lucide-react';

interface ErrorDisplayProps {
  title?: string;
  error: string;
  className?: string;
}

export function ErrorDisplay({
  title = "Error",
  error,
  className = ""
}: ErrorDisplayProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-6 bg-white/80 dark:bg-[#0B1222]/80 backdrop-blur-lg border border-gray-200 dark:border-white/10 rounded-lg text-center ${className}`}>
      <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
      <h3 className="text-red-600 dark:text-red-400 font-semibold mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {error}
      </p>
    </div>
  );
}