import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Search, Users, Star, GitFork, Globe, Loader2, ArrowRight, ExternalLink } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { ExploreTableSkeleton } from '../../components/skeletons';
import { useDebounce } from '../../hooks/useDebounce';
import { api, searchTopContributors } from '../../services/github';
import type { GithubUser, GitHubRepository as Repository } from '../../types/github';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { LANGUAGE_COLORS } from '../../constants/languageColors';
import { formatCount } from '../../utils/formatCount';
import EmptyState from '../../components/ui/EmptyState';
import LoadMoreButton from '../../components/ui/LoadMoreButton';


const QUICK_TOPICS = [
  'TypeScript', 'Rust', 'Python', 'Go', 'React',
  'Machine Learning', 'CLI tools', 'Open Source',
];

const Explore = () => {
  const navigate = useNavigate();
  usePageTitle('Explore');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 400);
  const [mode, setMode] = useState<'repos' | 'contributors'>('repos');

  const { data: repoData, isLoading: reposLoading, error: reposError } = useQuery({
    queryKey: ['repositories', debouncedQuery],
    queryFn: async () => {
      const { data } = await api.get('/api/github/search/repositories', {
        params: { q: debouncedQuery },
      });
      return data;
    },
    enabled: !!debouncedQuery && mode === 'repos',
  });

  const {
    data: contributorsData,
    isLoading: contributorsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['contributors', debouncedQuery, mode],
    queryFn: ({ pageParam = 1 }) =>
      searchTopContributors(debouncedQuery || 'followers:>1000', pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => lastPage.hasMore ? allPages.length + 1 : undefined,
    enabled: mode === 'contributors',
  });

  const contributors = useMemo(
    () => contributorsData?.pages.flatMap(p => p.users) ?? [],
    [contributorsData],
  );

  const repos: Repository[] = repoData?.items ?? [];
  const isLoading = mode === 'repos' ? reposLoading : contributorsLoading;
  const showHero = !debouncedQuery && mode === 'repos';

  const switchMode = (next: 'repos' | 'contributors') => {
    setMode(next);
    setSearchQuery('');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Hero / Search header ── */}
      {showHero ? (
        <div className="flex flex-col items-center justify-center flex-1 px-6 pb-16">
          {/* Glow orb behind search */}
          <div className="relative mb-10 text-center">
            <div className="absolute -inset-x-32 -inset-y-16 rounded-full bg-blue-500/[0.06] blur-3xl pointer-events-none" />
            <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-widest mb-3">Open Source Discovery</p>
            <h1 className="text-3xl font-bold text-white mb-2 relative">
              Explore the world's code
            </h1>
            <p className="text-sm text-gray-600 relative">
              Search 330M+ repositories and top contributors on GitHub
            </p>
          </div>

          {/* Search bar — large */}
          <div className="relative w-full max-w-xl mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search repositories…"
              className="w-full h-12 pl-11 pr-4 text-sm bg-[#0D1525] border border-white/[0.10] rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-[#111927] shadow-lg shadow-black/30 transition-all"
            />
            {isLoading && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 animate-spin" />
            )}
          </div>

          {/* Quick topics */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {QUICK_TOPICS.map(topic => (
              <button
                key={topic}
                onClick={() => setSearchQuery(topic)}
                className="px-3 py-1.5 text-xs font-medium rounded-full bg-white/[0.04] border border-white/[0.08] text-gray-500 hover:text-gray-200 hover:border-white/[0.16] hover:bg-white/[0.07] transition-all cursor-pointer"
              >
                {topic}
              </button>
            ))}
          </div>

          {/* Mode switch */}
          <button
            onClick={() => switchMode('contributors')}
            className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-300 transition-colors cursor-pointer group"
          >
            <Users className="w-3.5 h-3.5" />
            Browse top contributors instead
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      ) : (
        /* ── Compact header when results are shown ── */
        <div className="px-6 pt-6 pb-0 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-bold text-white">Explore</h1>
              <p className="text-xs text-gray-600 mt-0.5">
                {mode === 'repos' && repos.length > 0
                  ? `${repoData?.total_count?.toLocaleString() ?? 0} repositories found`
                  : mode === 'contributors' && contributors.length > 0
                  ? `${contributors.length} contributors`
                  : mode === 'contributors'
                  ? 'Top GitHub contributors'
                  : 'Search GitHub repositories'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pb-4 border-b border-white/[0.05]">
            {/* Mode toggle tabs */}
            <div className="flex items-center rounded-lg bg-[#111927] border border-white/[0.08] p-0.5 shrink-0">
              {(['repos', 'contributors'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    mode === m
                      ? 'bg-[#0D1525] text-white shadow-sm border border-white/[0.08]'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {m === 'repos' ? <Globe className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                  {m === 'repos' ? 'Repos' : 'Contributors'}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative h-8 flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={mode === 'repos' ? 'Search repositories…' : 'Filter contributors…'}
                className="w-full h-full pl-8 pr-3 text-xs bg-[#111927] border border-white/[0.10] rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-[#0D1525] transition-all"
              />
            </div>

            {isLoading && <Loader2 className="w-4 h-4 text-gray-700 animate-spin shrink-0" />}

            {/* Back to hero */}
            {mode === 'repos' && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-gray-700 hover:text-gray-400 transition-colors cursor-pointer shrink-0"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {!showHero && (
        <div className="flex-1 overflow-y-auto">

          {reposError instanceof Error && (
            <div className="p-6">
              <ErrorDisplay
                title={reposError.message.includes('rate limit') ? 'GitHub API rate limit exceeded' : 'Failed to load results'}
                error={reposError.message.includes('rate limit') ? 'Please wait a few minutes before trying again.' : reposError.message}
              />
            </div>
          )}

          {/* Repos table */}
          {mode === 'repos' && (
            isLoading ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="sticky top-0 z-10 bg-[#0B1222] border-b border-white/[0.06]">
                    <tr>
                      <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Repository</th>
                      <th className="hidden lg:table-cell px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-[12%]">Language</th>
                      <th className="px-4 py-3 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-[8%]">Stars</th>
                      <th className="hidden md:table-cell px-4 py-3 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-[8%]">Forks</th>
                    </tr>
                  </thead>
                  <ExploreTableSkeleton />
                </table>
              </div>
            ) : repos.length === 0 && debouncedQuery ? (
              <EmptyState title={`No repositories found for "${debouncedQuery}"`} subtitle="Try a different search term" />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#0B1222] border-b border-white/[0.06]">
                      <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Repository</th>
                      <th className="hidden lg:table-cell px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-[12%]">Language</th>
                      <th className="px-4 py-3 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-[8%]">Stars</th>
                      <th className="hidden md:table-cell px-4 py-3 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-[8%]">Forks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {repos.map(repo => {
                      const [owner, name] = repo.full_name.split('/');
                      const langColor = LANGUAGE_COLORS[repo.language] ?? '#6b7280';
                      return (
                        <tr
                          key={repo.id}
                          onClick={() => navigate(`/explore/${owner}/${name}`)}
                          className="group hover:bg-white/[0.025] transition-colors duration-100 cursor-pointer"
                        >
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={repo.owner.avatar_url}
                                alt={repo.owner.login}
                                width={28}
                                height={28}
                                loading="lazy"
                                decoding="async"
                                className="w-7 h-7 rounded-full shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors truncate leading-snug">
                                  <span className="text-gray-600 font-normal">{owner}/</span><span className="text-gray-200 group-hover:text-white">{name}</span>
                                </p>
                                {repo.description && (
                                  <p className="text-xs text-gray-600 mt-0.5 truncate">{repo.description}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="hidden lg:table-cell px-4 py-3.5">
                            {repo.language ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border" style={{
                                backgroundColor: `${langColor}14`,
                                borderColor: `${langColor}30`,
                                color: langColor,
                              }}>
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: langColor }} />
                                {repo.language}
                              </span>
                            ) : <span className="text-[10px] text-gray-700">—</span>}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="flex items-center justify-center gap-1 text-xs text-gray-500">
                              <Star className="w-3 h-3 text-amber-500/80" />
                              {formatCount(repo.stargazers_count)}
                            </span>
                          </td>
                          <td className="hidden md:table-cell px-4 py-3.5">
                            <span className="flex items-center justify-center gap-1 text-xs text-gray-600">
                              <GitFork className="w-3 h-3" />
                              {formatCount(repo.forks_count)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Contributors cards */}
          {mode === 'contributors' && (
            isLoading && contributors.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-6">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="animate-pulse flex flex-col items-center gap-2.5 p-5 rounded-xl bg-[#0D1525] border border-white/[0.06]">
                    <div className="w-14 h-14 rounded-full bg-white/[0.06]" />
                    <div className="h-3 bg-white/[0.05] rounded w-20" />
                    <div className="h-2.5 bg-white/[0.03] rounded w-14" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-6">
                  {contributors.map((user: GithubUser) => (
                    <div
                      key={user.id}
                      onClick={() => navigate(`/contributors/${user.login}`)}
                      className="group flex flex-col items-center gap-2.5 p-5 rounded-xl bg-[#0D1525] border border-white/[0.06] hover:border-white/[0.14] hover:bg-[#111927] transition-all cursor-pointer relative"
                    >
                      <img
                        src={user.avatar_url}
                        alt={user.login}
                        width={56}
                        height={56}
                        loading="lazy"
                        decoding="async"
                        className="w-14 h-14 rounded-full ring-2 ring-white/[0.06] group-hover:ring-white/[0.12] transition-all"
                      />
                      <div className="text-center min-w-0 w-full">
                        <p className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors truncate">{user.login}</p>
                        <p className="text-[10px] text-gray-700 mt-0.5">{user.public_repos} repos</p>
                      </div>
                      <a
                        href={`https://github.com/${user.login}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="absolute top-2.5 right-2.5 p-1 rounded text-gray-700 hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>

                {hasNextPage && (
                  <LoadMoreButton onClick={() => fetchNextPage()} isLoading={isFetchingNextPage} />
                )}
              </>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default Explore;
