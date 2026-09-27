import { useQuery, useQueryClient } from '@tanstack/react-query';
import { syncPrTracker } from '../services/github';

const PR_TRACKER_POLL_MS = 5 * 60 * 1000;

export const usePrTrackerSync = (login: string | null) => {
  const queryClient = useQueryClient();
  useQuery({
    queryKey: ['pr-tracker-sync', login],
    queryFn: async () => {
      await syncPrTracker();
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      return true;
    },
    enabled: !!login,
    refetchInterval: PR_TRACKER_POLL_MS,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: PR_TRACKER_POLL_MS,
  });
};
