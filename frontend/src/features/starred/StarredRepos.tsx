import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Star, GitFork, AlertCircle, ExternalLink, Search, Globe } from 'lucide-react';
import { getStarredRepos, type StarredRepo } from '../../services/github';
import { usePageTitle } from '../../hooks/usePageTitle';
import { formatRelativeDate } from '../../utils/formatDate';
import { CardSkeletonList } from '../../components/skeletons';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: 'bg-blue-500',
  JavaScript: 'bg-yellow-400',
  Python: 'bg-green-500',
  Rust: 'bg-orange-600',
  Go: 'bg-cyan-500',
  Java: 'bg-red-500',
  Ruby: 'bg-red-600',
  'C++': 'bg-pink-600',
  C: 'bg-gray-600',
  'C#': 'bg-purple-600',
  Swift: 'bg-orange-500',
  Kotlin: 'bg-purple-500',
  PHP: 'bg-indigo-400',
  Shell: 'bg-green-600',
  Vue: 'bg-emerald-500',
  Svelte: 'bg-orange-500',
  Dart: 'bg-cyan-600',
};

function formatStars(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

function RepoCard({ repo }: { repo: StarredRepo }) {
  const navigate = useNavigate();
  const [owner, repoName] = repo.full_name.split('/');
  const dotColor = LANGUAGE_COLORS[repo.language ?? ''] ?? 'bg-gray-400';

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col gap-3 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-md transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 min-w-0">
        <button
          onClick={() => navigate(`/explore/${owner}/${repoName}`)}
          className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline truncate text-left"
        >
          {repo.full_name}
        </button>
        <a
          href={repo.html_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0 transition-colors"
          title="Open on GitHub"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Description */}
      {repo.description ? (
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">
          {repo.description}
        </p>
      ) : (
        <p className="text-sm text-gray-400 dark:text-gray-600 italic">No description</p>
      )}

      {/* Topics */}
      {repo.topics?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {repo.topics.slice(0, 4).map(topic => (
            <span
              key={topic}
              className="px-2 py-0.5 text-xs rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
            >
              {topic}
            </span>
          ))}
          {repo.topics.length > 4 && (
            <span className="text-xs text-gray-400 dark:text-gray-500 self-center">
              +{repo.topics.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Footer stats */}
      <div className="flex items-center justify-between pt-1 mt-auto">
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          {repo.language && (
            <span className="flex items-center gap-1">
              <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
              {repo.language}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3" />
            {formatStars(repo.stargazers_count)}
          </span>
          <span className="flex items-center gap-1">
            <GitFork className="w-3 h-3" />
            {repo.forks_count}
          </span>
          {repo.open_issues_count > 0 && (
            <span className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {repo.open_issues_count}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-600">
          {formatRelativeDate(repo.updated_at)}
        </span>
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

  const languages = useMemo(() => {
    const langs = new Set(allRepos.map(r => r.language).filter(Boolean) as string[]);
    return Array.from(langs).sort();
  }, [allRepos]);

  return (
    <div className="w-full p-6 dark:bg-[#0B1222] mt-[64px]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Starred Repositories</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Repositories you've starred on GitHub — your watchlist for contribution ideas.
        </p>
      </div>

      {/* Search + stats bar */}
      {!isLoading && allRepos.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by name, language, topic…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            <Globe className="w-3.5 h-3.5" />
            <span>{languages.length} languages</span>
            <span>·</span>
            <span>{allRepos.length} repos{hasNextPage ? '+' : ''}</span>
            {search && filtered.length !== allRepos.length && (
              <>
                <span>·</span>
                <span className="text-amber-600 dark:text-amber-400">{filtered.length} matching</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading && <CardSkeletonList count={9} />}

      {!isLoading && error instanceof Error && (
        <ErrorDisplay title="Failed to load starred repos" error={error.message} />
      )}

      {!isLoading && !error && allRepos.length === 0 && (
        <div className="text-center py-20 text-gray-500 dark:text-gray-400">
          <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">You haven't starred any repositories yet.</p>
          <p className="text-xs mt-1 text-gray-400">Star a repo from the Explore page to see it here.</p>
        </div>
      )}

      {!isLoading && !error && allRepos.length > 0 && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No repos match "{search}"</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(repo => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>
      )}

      {hasNextPage && !search && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
          >
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
};

export default StarredRepos;
