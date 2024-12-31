import { memo } from 'react';
import type { LucideIcon } from 'lucide-react';

interface InfoItemProps {
  icon: LucideIcon;
  text: string;
}

export const InfoItem = memo(function InfoItem({ icon: Icon, text }: InfoItemProps) {
  return (
    <div className="flex items-center text-gray-500 dark:text-gray-400">
      <Icon className="w-4 h-4 mr-2" />
      {text}
    </div>
  );
}); 