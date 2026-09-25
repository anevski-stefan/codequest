import { Skeleton } from '../ui/Skeleton';

// Mirrors the IssueTable card so content swaps in without a layout jump.
export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#2E3245]/60 p-4">
      <div className="flex items-start gap-3 mb-3">
        <Skeleton className="h-4 flex-1 max-w-[75%]" />
        <Skeleton className="h-5 w-12 rounded-md" />
      </div>
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-16 ml-auto" />
      </div>
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-20 rounded-md" />
        <Skeleton className="h-5 w-14 rounded-md" />
      </div>
    </div>
  );
}

export function CardSkeletonList({ count = 6, className = 'grid grid-cols-1 lg:grid-cols-2 gap-2.5' }: { count?: number; className?: string }) {
  return (
    <div className={className} role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
