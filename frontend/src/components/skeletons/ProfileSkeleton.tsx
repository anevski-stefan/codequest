import { Skeleton } from '../ui/Skeleton';

export function ProfileSkeleton() {
  return (
    <div className="flex flex-col md:flex-row gap-6 p-4 md:p-6">
      {/* Sidebar Skeleton */}
      <div className="md:w-80 shrink-0">
        <div className="bg-white dark:bg-[#0B1222] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-white/10">
          <div className="flex flex-col items-center">
            <Skeleton className="w-32 h-32 rounded-full" />
            <Skeleton className="mt-4 h-6 w-48" />
            <Skeleton className="mt-2 h-4 w-32" />
            <Skeleton className="mt-4 h-16 w-full" />
            <div className="mt-6 w-full space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[90%]" />
              <Skeleton className="h-4 w-[80%]" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 space-y-6">
        <div className="bg-white dark:bg-[#0B1222] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-white/10">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start space-x-3 p-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[90%]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}