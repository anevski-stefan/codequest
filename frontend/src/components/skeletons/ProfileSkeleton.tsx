import { Skeleton } from '../ui/Skeleton';

// Mirrors ProfileLayout: hero strip with avatar + stats, then content grid.
export function ProfileSkeleton() {
  return (
    <div className="flex flex-col h-full overflow-hidden" role="status" aria-label="Loading profile">
      <div className="shrink-0 border-b border-white/[0.05] px-4 sm:px-8 pt-7 pb-6">
        <div className="flex items-start gap-4 sm:gap-6">
          <Skeleton className="w-[72px] h-[72px] rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-full max-w-md" />
            <div className="flex gap-4 pt-1">
              {[60, 80, 70].map((w, i) => <Skeleton key={i} className="h-3" style={{ width: w }} />)}
            </div>
          </div>
        </div>
        <div className="flex gap-6 mt-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-5 w-10" />
              <Skeleton className="h-2.5 w-14" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 px-4 sm:px-8 py-6 grid md:grid-cols-2 gap-2.5 content-start">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/[0.06] bg-[#2E3245]/60 p-4 space-y-3">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
