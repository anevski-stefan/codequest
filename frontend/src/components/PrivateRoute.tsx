import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { Skeleton } from './ui/Skeleton';
const PrivateRoute = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const {
    isAuthenticated,
    restored
  } = useSelector((state: RootState) => state.auth);
  const location = useLocation();
  if (!restored) {
    return <div className="max-w-[1400px] px-6 lg:px-8 pt-7 pb-12 space-y-8" role="status" aria-label="Restoring your session">
        <div className="mb-5">
          <Skeleton className="h-2.5 w-16 mb-2" />
          <Skeleton className="h-6 w-52 mb-2" />
          <Skeleton className="h-3.5 w-72" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-[#2E3245] p-4">
              <Skeleton className="h-3.5 w-4/5" />
              <Skeleton className="h-3.5 w-3/5" />
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-16 rounded-md" />
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
              <div className="mt-auto flex items-center gap-3 min-h-[20px]">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3 w-10" />
              </div>
            </div>)}
        </div>
      </div>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{
      from: location
    }} replace />;
  }
  return <>{children}</>;
};
export default PrivateRoute;