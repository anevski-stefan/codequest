import { memo } from 'react';

interface SourceBadgeProps {
  source: string;
}

export const SourceBadge = memo(function SourceBadge({ source }: SourceBadgeProps) {
  return (
    <span className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
      {source}
    </span>
  );
}); 