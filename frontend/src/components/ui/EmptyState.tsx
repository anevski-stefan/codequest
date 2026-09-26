import type { ComponentType, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { easeOut } from '../../lib/motion';

interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

const EmptyState = ({ icon: Icon, title, subtitle, action }: EmptyStateProps) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: easeOut }}
    className="flex flex-col items-center justify-center py-20 px-6 text-center"
  >
    {Icon && (
      <div className="relative mb-5">
        <div className="absolute inset-0 -m-3 rounded-2xl border border-dashed border-white/[0.06]" />
        <div className="relative w-12 h-12 rounded-xl bg-[#2E3245] border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] flex items-center justify-center">
          <Icon className="w-5 h-5 text-gray-400" />
        </div>
      </div>
    )}
    <p className="text-sm font-semibold text-gray-200">{title}</p>
    {subtitle && <p className="text-[13px] text-gray-500 mt-1.5 max-w-xs leading-relaxed">{subtitle}</p>}
    {action && <div className="mt-5">{action}</div>}
  </motion.div>
);

export default EmptyState;
