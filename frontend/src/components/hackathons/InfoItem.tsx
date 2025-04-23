import { memo } from 'react';
import { LucideIcon } from 'lucide-react';

interface InfoItemProps {
  icon: LucideIcon;
  text: string;
  isDeadline?: boolean;
  isUrgent?: boolean;
}

export const InfoItem = memo(function InfoItem({ 
  icon: Icon, 
  text, 
  isDeadline, 
  isUrgent 
}: InfoItemProps) {
  return (
    <div className={`flex items-center text-sm font-medium ${
      isDeadline && isUrgent
        ? 'text-red-600 dark:text-red-400' 
        : 'text-gray-600 dark:text-gray-400'
    }`}>
      <Icon className={`w-4 h-4 mr-2 flex-shrink-0 ${
        isDeadline && isUrgent
          ? 'animate-pulse text-red-600 dark:text-red-400' 
          : ''
      }`} />
      <span className="leading-relaxed">{text}</span>
    </div>
  );
}); 