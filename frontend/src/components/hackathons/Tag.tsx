import { memo } from 'react';

interface TagProps {
  text: string;
}

export const Tag = memo(function Tag({ text }: TagProps) {
  return (
    <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
      {text}
    </span>
  );
}); 