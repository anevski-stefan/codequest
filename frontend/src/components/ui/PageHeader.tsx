import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { easeOut } from '../../lib/motion';

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  eyebrow?: string;
  actions?: ReactNode;
}

const PageHeader = ({ title, subtitle, eyebrow, actions }: PageHeaderProps) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: easeOut }}
    className="flex items-end justify-between gap-4 mb-5"
  >
    <div className="min-w-0">
      {eyebrow && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-400/80 mb-1.5">{eyebrow}</p>
      )}
      <h1 className="text-xl font-bold tracking-tight text-white">{title}</h1>
      {subtitle && <div className="text-sm text-gray-500 mt-0.5">{subtitle}</div>}
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </motion.div>
);

export default PageHeader;
