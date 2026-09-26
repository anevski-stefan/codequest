import { CircleDashed, Hand, GitPullRequestArrow, Hourglass, CircleCheck, UserCheck } from 'lucide-react';
import type { ClaimStatus, IssueClaim } from '../../types/github';

// Colour is never the only signal: every status has its own icon and label.
const CLAIM_META: Record<Exclude<ClaimStatus, 'unknown'>, { label: string; cls: string; icon: typeof Hand }> = {
  free: { label: 'Free', cls: 'text-green-300 bg-green-500/[0.08] border-green-500/25', icon: CircleDashed },
  requested: { label: 'Requested', cls: 'text-amber-300 bg-amber-400/[0.08] border-amber-400/25', icon: Hand },
  in_progress: { label: 'In progress', cls: 'text-blue-300 bg-blue-500/[0.08] border-blue-500/25', icon: GitPullRequestArrow },
  stale: { label: 'Stalled', cls: 'text-gray-300 bg-white/[0.05] border-white/[0.12]', icon: Hourglass },
  closed: { label: 'Closed', cls: 'text-gray-400 bg-white/[0.04] border-white/[0.08]', icon: CircleCheck },
};

interface Props {
  claim?: IssueClaim;
  loading?: boolean;
  size?: 'sm' | 'md';
  /** Announce the reason to screen readers; off when the reason is already on screen. */
  describe?: boolean;
}

const ClaimBadge = ({ claim, loading, size = 'sm', describe = true }: Props) => {
  const dims = size === 'sm' ? 'h-5 px-1.5 text-[10px] gap-1' : 'h-6 px-2 text-[11px] gap-1.5';
  if (loading && !claim) {
    return <span className={`skeleton inline-block ${size === 'sm' ? 'h-5 w-14' : 'h-6 w-20'} rounded-md`} aria-hidden="true" />;
  }
  if (!claim || claim.status === 'unknown') return null;
  const meta = CLAIM_META[claim.status];
  // In-progress issues assigned (rather than PR'd) read better as "Assigned".
  const assignedOnly = claim.status === 'in_progress' && !claim.pr;
  const Icon = assignedOnly ? UserCheck : meta.icon;
  return (
    <span
      className={`inline-flex items-center rounded-md border font-semibold whitespace-nowrap ${dims} ${meta.cls}`}
      title={claim.reason}
    >
      <Icon className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} aria-hidden="true" />
      {assignedOnly ? 'Assigned' : meta.label}
      {describe && <span className="sr-only">: {claim.reason}</span>}
    </span>
  );
};

export default ClaimBadge;
