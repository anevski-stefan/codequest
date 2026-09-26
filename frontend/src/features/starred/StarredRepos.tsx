import { useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Star, GitFork, CircleDot, ExternalLink, Search } from 'lucide-react';
import { getStarredRepos, type StarredRepo } from '../../services/github';
import { usePageTitle } from '../../hooks/usePageTitle';
import { LANGUAGE_COLORS } from '../../constants/languageColors';
import { formatCount } from '../../utils/formatCount';
import EmptyState from '../../components/ui/EmptyState';
import LoadMoreButton from '../../components/ui/LoadMoreButton';
import { formatRelativeDate } from '../../utils/formatDate';
import { CardSkeletonList } from '../../components/skeletons';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';


function RepoRow({ repo }: { repo: StarredRepo }) {
  const navigate = useNavigate();
  const [owner, repoName] = repo.full_name.split('/');
  const langColor = LANGUAGE_COLORS[repo.language ?? ''] ?? '#6b7280';

  return (
    <div
      role="link"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') navigate(`/explore/${owner}/${repoName}`); }}
      className="group flex flex-col rounded-xl border border-white/[0.07] bg-[#2E3245] p-4 hover:border-white/[0.14] hover:bg-[#31364C] hover:-translate-y-px hover:shadow-[0_12px_24px_-12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-0 transition-[background-color,border-color,box-shadow,transform] duration-200 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
      onClick={() => navigate(`/explore/${owner}/${repoName}`)}
    >
      {/* Row 1: name + stats */}
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <p className="flex items-center gap-2 min-w-0 text-sm font-semibold text-gray-100 group-hover:text-white transition-colors leading-snug">
          <img src={repo.owner.avatar_url} alt="" width={20} height={20} loading="lazy" className="w-5 h-5 rounded-md shrink-0 bg-white/[0.06]" />
          <span className="truncate"><span className="text-gray-500 font-normal">{owner}/</span>{repoName}</span>
        </p>
        <div className="flex items-center gap-2.5 shrink-0">
          {repo.language && (
            <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: langColor }} />
              {repo.language}
            </span>
          )}
          <span className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
            <Star className="w-3 h-3 fill-amber-400" />
            {formatCount(repo.stargazers_count)}
          </span>
        </div>
      </div>

      {/* Description */}
      {repo.description && (
        <p className="text-[13px] text-gray-400 line-clamp-2 mb-3 leading-relaxed">{repo.description}</p>
      )}

      {/* Row 3: topics + meta inline */}
      <div className="flex items-center gap-2 mt-auto">
        <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
          {repo.topics?.slice(0, 3).map(topic => (
            <span
              key={topic}
              className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-blue-500/[0.08] border border-blue-500/[0.15] text-blue-400 truncate max-w-[90px] shrink-0"
            >
              {topic}
            </span>
          ))}
          {(repo.topics?.length ?? 0) > 3 && (
            <span className="text-[10px] text-gray-500 shrink-0">+{repo.topics.length - 3}</span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-auto">
          {repo.forks_count > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-gray-500">
              <GitFork className="w-3 h-3" />
              {formatCount(repo.forks_count)}
            </span>
          )}
          {repo.open_issues_count > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-gray-500 tabular" title={`${repo.open_issues_count} open issues`}>
              <CircleDot className="w-3 h-3 text-green-400/70" />
              {formatCount(repo.open_issues_count)}
            </span>
          )}
          <span className="text-[11px] text-gray-400 hidden sm:block">{formatRelativeDate(repo.updated_at)}</span>
          <a
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            aria-label="Open on GitHub"
            className="w-7 h-7 -my-1 flex items-center justify-center rounded-md text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all [@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          >
            <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </div>
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
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="px-6 lg:px-8 pt-7 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-400/80 mb-1.5">Workspace</p>
            <h1 className="text-xl font-bold tracking-tight text-white">Starred</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {allRepos.length > 0
                ? `${allRepos.length}${hasNextPage ? '+' : ''} repos${search && filtered.length !== allRepos.length ? ` · ${filtered.length} matching` : ''}`
                : 'Your GitHub watchlist — repos worth contributing to'}
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
              className="w-full h-full pl-8 pr-3 text-[11px] bg-[#363B52] border border-white/[0.09] rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-[#2E3245] transition-all"
            />
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="px-4 lg:px-6 xl:px-8 py-4"><CardSkeletonList count={8} /></div>
        ) : error instanceof Error ? (
          <div className="p-6"><ErrorDisplay title="Failed to load starred repos" error={error.message} /></div>
        ) : allRepos.length === 0 ? (
          <EmptyState icon={Star} title="No starred repositories yet" subtitle="Star repositories on GitHub or from Explore, and they will show up here as your watchlist." />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Search} title={`No repos match "${search}"`} />
        ) : (
          <>
            <div className="px-4 lg:px-6 xl:px-8 py-4 grid grid-cols-1 lg:grid-cols-2 gap-2.5">
              {filtered.map((repo, i) => (
                <div key={repo.id} className="reveal flex [&>*]:flex-1 [&>*]:min-w-0" style={{ '--i': i % 30 } as CSSProperties}>
                  <RepoRow repo={repo} />
                </div>
              ))}
            </div>

            {hasNextPage && !search && (
              <LoadMoreButton onClick={() => fetchNextPage()} isLoading={isFetchingNextPage} />
            )}

            {!hasNextPage && filtered.length > 0 && (
              <p className="flex items-center justify-center gap-3 text-[11px] text-gray-600 py-6 before:h-px before:w-12 before:bg-white/[0.06] after:h-px after:w-12 after:bg-white/[0.06]">End of results</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StarredRepos;
