import { memo, useState } from 'react';
import { ChevronDown, ChevronUp, CheckSquare } from 'lucide-react';

interface RequirementsAccordionProps {
  requirements: string[];
}

export const RequirementsAccordion = memo(function RequirementsAccordion({ 
  requirements 
}: RequirementsAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!requirements?.length) return null;

  return (
    <div className="mt-4 border dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors"
      >
        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
          <CheckSquare className="w-4 h-4" />
          <span className="font-medium">Requirements</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({requirements.length})
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>
      
      {isExpanded && (
        <div className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            {requirements.map((req, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}); 