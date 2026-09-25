export function HackathonSkeleton() {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#2E3245] p-5 ">
      {/* Title row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="h-4 skeleton rounded w-3/5" />
        <div className="h-5 skeleton rounded-md w-16 shrink-0" />
      </div>
      {/* Description */}
      <div className="h-3 skeleton rounded w-4/5 mb-4" />
      {/* Meta pills */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-5 skeleton rounded-md w-20" />
        <div className="h-3 skeleton rounded w-24" />
        <div className="h-3 skeleton rounded w-16" />
      </div>
      {/* Tags */}
      <div className="flex gap-1.5">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-4 skeleton rounded-md w-16" />
        ))}
      </div>
    </div>
  );
}
