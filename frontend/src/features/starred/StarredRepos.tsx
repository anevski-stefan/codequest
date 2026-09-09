import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Star, GitFork, AlertCircle, ExternalLink, Search, Loader2 } from 'lucide-react';
import { getStarredRepos, type StarredRepo } from '../../services/github';
import { usePageTitle } from '../../hooks/usePageTitle';
import { LANGUAGE_COLORS } from '../../constants/languageColors';
import { formatCount } from '../../utils/formatCount';
import EmptyState from '../../components/ui/EmptyState';
import { formatRelativeDate } from '../../utils/formatDate';
import { CardSkeletonList } from '../../components/skeletons';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';


function RepoRow({ repo }: { repo: StarredRepo }) {
  const navigate = useNavigate();
  const [owner, repoName] = repo.full_name.split('/');
  const langColor = LANGUAGE_COLORS[repo.language ?? ''] ?? '#6b7280';

  return (
    <tr className="group hover:bg-white/[0.025] transition-colors duration-100">
      {/* Repository */}
      <td className="px-6 py-3.5">
        <button
          onClick={() => navigate(`/explore/${owner}/${repoName}`)}
          className="text-left w-full cursor-pointer"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors leading-snug">
              <span className="text-gray-600 font-normal">{owner}/</span>{repoName}
            </p>
            {repo.description && (
              <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{repo.description}</p>
            )}
          </div>
        </button>
      </td>

      {/* Topics */}
      <td className="hidden md:table-cell px-4 py-3.5">
        <div className="flex flex-wrap gap-1">
          {repo.topics?.slice(0, 3).map(topic => (
            <span
              key={topic}
              className="px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-blue-500/[0.08] border border-blue-500/[0.15] text-blue-400 truncate max-w-[90px]"
            >
              {topic}
            </span>
          ))}
          {(repo.topics?.length ?? 0) > 3 && (
            <span className="text-[10px] text-gray-600">+{repo.topics.length - 3}</span>
          )}
          {!repo.topics?.length && <span className="text-[10px] text-gray-700">—</span>}
        </div>
      </td>

      {/* Language */}
      <td className="hidden lg:table-cell px-4 py-3.5">
        {repo.language ? (
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: langColor }} />
            {repo.language}
          </span>
        ) : <span className="text-[10px] text-gray-700">—</span>}
      </td>

      {/* Stars */}
      <td className="px-4 py-3.5 text-center">
        <span className="flex items-center justify-center gap-1 text-xs text-gray-500">
          <Star className="w-3 h-3 text-amber-500" />
          {formatCount(repo.stargazers_count)}
        </span>
      </td>

      {/* Forks */}
      <td className="hidden lg:table-cell px-4 py-3.5 text-center">
        <span className="flex items-center justify-center gap-1 text-xs text-gray-600">
          <GitFork className="w-3 h-3" />
          {repo.forks_count}
        </span>
      </td>

      {/* Issues */}
      <td className="hidden lg:table-cell px-4 py-3.5 text-center">
        <span className={`flex items-center justify-center gap-1 text-xs ${repo.open_issues_count > 0 ? 'text-amber-600' : 'text-gray-700'}`}>
          <AlertCircle className="w-3 h-3" />
          {repo.open_issues_count || '—'}
        </span>
      </td>

      {/* Updated + actions */}
      <td className="px-4 py-3.5">
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-gray-700 whitespace-nowrap hidden xl:block">{formatRelativeDate(repo.updated_at)}</span>
          <a
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-gray-700 hover:text-gray-300 transition-colors rounded opacity-0 group-hover:opacity-100"
          >
            <ExternalLink size={13} />
          </a>
        </div>
      </td>
    </tr>
  );
}

const StarredRepos = () => {
  usePageTitle('Starred Repos');
  const [search, setSearch] = useState('');

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['starred-repos'],
      queryFn: ({ pageParam = 1 }) => getStarredRepos(pageParam as number),
      initialPageParam: 1,
      getNextPageParam: (lastPage, allPages) => lastPage.hasMore ? allPages.length + 1 : undefined,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
    });

  const allRepos = useMemo(() => data?.pages.flatMap(p => p.repos) ?? [], [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRepos;
    return allRepos.filter(r =>
      r.full_name.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.language?.toLowerCase().includes(q) ||
      r.topics?.some(t => t.toLowerCase().includes(q))
    );
  }, [allRepos, search]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">

      {/* Header */}
      <div className="px-6 pt-6 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-white">Starred Repositories</h1>
            <p className="text-xs text-gray-600 mt-0.5">
              {allRepos.length > 0
                ? `${allRepos.length}${hasNextPage ? '+' : ''} repos${search && filtered.length !== allRepos.length ? ` · ${filtered.length} matching` : ''}`
                : 'Your GitHub starred repos — contribution watchlist'}
            </p>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-2 pb-4 border-b border-white/[0.05]">
          <div className="relative flex-1 max-w-sm h-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter by name, language, topic…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-full pl-8 pr-3 text-xs bg-[#111927] border border-white/[0.10] rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-[#0D1525] transition-all"
            />
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-6"><CardSkeletonList count={9} /></div>
        ) : error instanceof Error ? (
          <div className="p-6"><ErrorDisplay title="Failed to load starred repos" error={error.message} /></div>
        ) : allRepos.length === 0 ? (
          <EmptyState icon={Star} title="No starred repositories yet" subtitle="Star a repo from the Explore page to see it here" />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Search} title={`No repos match "${search}"`} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#0B1222] border-b border-white/[0.06]">
                    <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-[32%]">Repository</th>
                    <th className="hidden md:table-cell px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-[22%]">Topics</th>
                    <th className="hidden lg:table-cell px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-[12%]">Language</th>
                    <th className="px-4 py-3 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-[8%]">Stars</th>
                    <th className="hidden lg:table-cell px-4 py-3 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-[8%]">Forks</th>
                    <th className="hidden lg:table-cell px-4 py-3 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-[8%]">Issues</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-[10%]">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map(repo => (
                    <RepoRow key={repo.id} repo={repo} />
                  ))}
                </tbody>
              </table>
            </div>

            {hasNextPage && !search && (
              <div className="flex justify-center py-5 border-t border-white/[0.04]">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm text-gray-400 border border-white/[0.08] hover:border-white/[0.15] hover:text-white disabled:opacity-40 transition-all cursor-pointer"
                >
                  {isFetchingNextPage ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading…</> : 'Load more'}
                </button>
              </div>
            )}

            {!hasNextPage && filtered.length > 0 && (
              <p className="text-center text-xs text-gray-700 py-5 border-t border-white/[0.04]">All repos loaded</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StarredRepos;
