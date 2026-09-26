import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { claimKey, getIssueClaims } from '../services/github';
import type { Issue, IssueClaim } from '../types/github';

const CHUNK = 25;

/**
 * Claim status for a list of issues. Fetched in fixed chunks so "Load more"
 * only requests the new page, and each chunk is cached on its own.
 */
export default function useIssueClaims(issues: Issue[], enabled = true) {
  const chunks = useMemo(() => {
    const out: Issue[][] = [];
    for (let i = 0; i < issues.length; i += CHUNK) out.push(issues.slice(i, i + CHUNK));
    return out;
  }, [issues]);

  const results = useQueries({
    queries: chunks.map(chunk => ({
      queryKey: ['issue-claims', chunk.map(i => claimKey(i.repository.fullName, i.number)).join(',')],
      queryFn: () => getIssueClaims(chunk),
      enabled: enabled && chunk.length > 0,
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
    })),
  });

  const claims = useMemo(() => {
    const map: Record<string, IssueClaim> = {};
    results.forEach(r => { if (r.data) Object.assign(map, r.data); });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results.map(r => r.dataUpdatedAt).join(',')]);

  // Errors resolve to "no badge" rather than an endless skeleton.
  const loading = results.some(r => r.isLoading);
  return { claims, loading };
}

export const claimFor = (claims: Record<string, IssueClaim>, issue: Issue) =>
  claims[claimKey(issue.repository.fullName, issue.number)];
