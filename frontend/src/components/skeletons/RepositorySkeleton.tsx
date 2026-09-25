import { Skeleton } from '../ui/Skeleton';

// Mirrors RepositoryDetails: header strip, tab bar, list + sidebar.
export function RepositorySkeleton() {
  return (
    <div className="flex flex-col h-full overflow-hidden" role="status" aria-label="Loading repository">
      <div className="shrink-0 border-b border-white/[0.05] px-6 pt-5 pb-4">
        <div className="flex items-start gap-4">
          <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2.5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full max-w-xl" />
            <div className="flex gap-4">
              {[40, 36, 36, 60, 90].map((w, i) => <Skeleton key={i} className="h-3" style={{ width: w }} />)}
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 grid lg:grid-cols-[1fr_300px] gap-6 p-6">
        <div className="space-y-2.5">
          <div className="flex gap-2 mb-4">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white/[0.06] bg-[#2E3245]/60 p-4 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </div>
        <div className="hidden lg:block space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl border border-white/[0.06] bg-[#2E3245]/60 p-4 space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
