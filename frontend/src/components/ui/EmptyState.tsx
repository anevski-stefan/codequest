import type { ComponentType } from 'react';

interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
}

const EmptyState = ({ icon: Icon, title, subtitle }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center h-64 text-center">
    {Icon && (
      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
        <Icon className="w-4 h-4 text-gray-600" />
      </div>
    )}
    <p className="text-sm text-gray-400">{title}</p>
    {subtitle && <p className="text-xs text-gray-600 mt-1">{subtitle}</p>}
  </div>
);

export default EmptyState;
