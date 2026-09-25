import { useState, useMemo, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Search, Users, Star, GitFork, Globe, Loader2, ArrowRight, ExternalLink } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
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
        <div className="flex flex-1 items-center px-6 lg:px-10 py-6">
          <div className="w-full max-w-5xl mx-auto grid lg:grid-cols-5 gap-8 lg:gap-14 items-center">

            {/* Left — 3 cols: label + heading + search + topics + mode */}
            <div className="lg:col-span-3 flex flex-col gap-5">
              <div className="reveal" style={{ '--i': 0 } as CSSProperties}>
                <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-widest mb-2">Open Source Discovery</p>
                <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight">
                  Explore the world's code
                </h1>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  Search 330M+ repositories and top contributors on GitHub
                </p>
              </div>

              {/* Search bar */}
              <div className="relative reveal" style={{ '--i': 2 } as CSSProperties}>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search repositories…"
                  className="w-full h-12 pl-11 pr-4 text-sm bg-[#2E3245] border border-white/[0.10] rounded-xl text-gray-200 placeholder-gray-500 focus:outline-none focus-visible:outline-none focus:border-blue-500/50 focus:bg-[#363B52] focus:shadow-[0_0_0_4px_rgba(59,123,255,0.12)] shadow-lg shadow-black/30 transition-all"
                />
                {isLoading && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 animate-spin" />
                )}
              </div>

              {/* Quick topics */}
              <div className="flex flex-wrap gap-2 reveal" style={{ '--i': 4 } as CSSProperties}>
                {QUICK_TOPICS.map(topic => (
                  <button
                    key={topic}
                    onClick={() => setSearchQuery(topic)}
                    className="h-8 px-3 text-xs font-medium rounded-full bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-gray-100 hover:border-white/[0.16] hover:bg-white/[0.07] active:scale-[0.96] transition-all cursor-pointer"
                  >
                    {topic}
                  </button>
                ))}
              </div>

              {/* Mode switch */}
              <button
                onClick={() => switchMode('contributors')}
                className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-300 transition-colors cursor-pointer group w-fit"
              >
                <Users className="w-3.5 h-3.5" />
                Browse top contributors instead
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Right — 2 cols: stat cards */}
            <div className="hidden lg:flex lg:col-span-2 flex-col gap-3">
              {[
                { value: '330M+', label: 'Repositories indexed', icon: Globe },
                { value: '100M+', label: 'Active developers', icon: Users },
                { value: '4B+', label: 'Total contributions', icon: Star },
              ].map(({ value, label, icon: Icon }, i) => (
                <div key={label} style={{ '--i': 3 + i * 2 } as CSSProperties} className="reveal flex items-center gap-4 px-5 py-4 rounded-xl bg-[#2E3245] border border-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <Icon className="w-4 h-4 text-gray-600 shrink-0" />
                  <div>
                    <div className="text-xl font-bold tabular-nums text-white tracking-tight">{value}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      ) : (
        /* ── Compact header when results are shown ── */
        <div className="px-6 lg:px-8 pt-7 pb-0 shrink-0">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-400/80 mb-1.5">Discover</p>
              <h1 className="text-xl font-bold tracking-tight text-white">Explore</h1>
              <p className="text-sm text-gray-500 mt-0.5">
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

          <div className="flex items-center gap-2 pb-4 border-b border-white/[0.05] flex-wrap">
            {/* Mode toggle tabs */}
            <div className="flex items-center rounded-lg bg-[#363B52] border border-white/[0.08] p-0.5 shrink-0">
              {(['repos', 'contributors'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    mode === m
                      ? 'bg-[#2E3245] text-white shadow-sm border border-white/[0.08]'
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
                className="w-full h-full pl-8 pr-3 text-[11px] bg-[#363B52] border border-white/[0.09] rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-[#2E3245] transition-all"
              />
            </div>

            {isLoading && <Loader2 className="w-4 h-4 text-gray-500 animate-spin shrink-0" />}

            {/* Back to hero */}
            {mode === 'repos' && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-gray-500 hover:text-gray-400 transition-colors cursor-pointer shrink-0"
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

          {/* Repos cards */}
          {mode === 'repos' && (
            isLoading ? (
              <div className="px-4 lg:px-6 xl:px-8 py-4 grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse rounded-xl border border-white/[0.07] bg-[#2E3245] p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-7 h-7 rounded-full bg-white/[0.07] shrink-0" />
                      <div className="h-4 bg-white/[0.07] rounded w-2/5" />
                      <div className="ml-auto h-4 bg-white/[0.05] rounded w-12" />
                    </div>
                    <div className="h-3 bg-white/[0.05] rounded w-4/5 mb-3" />
                    <div className="flex gap-2">
                      <div className="h-4 bg-white/[0.05] rounded-full w-16" />
                      <div className="h-4 bg-white/[0.04] rounded w-10" />
                    </div>
                  </div>
                ))}
              </div>
            ) : repos.length === 0 && debouncedQuery ? (
              <EmptyState title={`No repositories found for "${debouncedQuery}"`} subtitle="Try a different search term" />
            ) : (
              <div className="px-4 lg:px-6 xl:px-8 py-4 grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                {repos.map(repo => {
                  const [owner, name] = repo.full_name.split('/');
                  const langColor = LANGUAGE_COLORS[repo.language] ?? '#6b7280';
                  return (
                    <div
                      key={repo.id}
                      onClick={() => navigate(`/explore/${owner}/${name}`)}
                      className="group rounded-xl border border-white/[0.07] bg-[#2E3245] p-4 hover:border-white/[0.14] hover:bg-[#31364C] hover:-translate-y-px hover:shadow-[0_12px_24px_-12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-0 transition-[background-color,border-color,box-shadow,transform] duration-200 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                    >
                      {/* Row 1: avatar + name + stars */}
                      <div className="flex items-center gap-3 mb-2">
                        <img
                          src={repo.owner.avatar_url}
                          alt={repo.owner.login}
                          width={28}
                          height={28}
                          loading="lazy"
                          decoding="async"
                          className="w-7 h-7 rounded-full shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                        <p className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors truncate flex-1 leading-snug">
                          <span className="text-gray-500 font-normal">{owner}/</span>{name}
                        </p>
                        <span className="flex items-center gap-1 text-[11px] text-amber-400 font-medium shrink-0">
                          <Star className="w-3 h-3 fill-amber-400" />
                          {formatCount(repo.stargazers_count)}
                        </span>
                      </div>

                      {/* Description */}
                      {repo.description && (
                        <p className="text-xs text-gray-400 line-clamp-1 mb-3 leading-relaxed">{repo.description}</p>
                      )}

                      {/* Language + forks */}
                      <div className="flex items-center gap-3">
                        {repo.language && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-400">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: langColor }} />
                            {repo.language}
                          </span>
                        )}
                        {repo.forks_count > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-gray-500">
                            <GitFork className="w-3 h-3" />
                            {formatCount(repo.forks_count)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Contributors cards */}
          {mode === 'contributors' && (
            isLoading && contributors.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-6">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="animate-pulse flex flex-col items-center gap-2.5 p-5 rounded-xl bg-[#2E3245] border border-white/[0.06]">
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
                      className="group flex flex-col items-center gap-2.5 p-5 rounded-xl bg-[#2E3245] border border-white/[0.06] hover:border-white/[0.14] hover:bg-[#363B52] transition-all cursor-pointer relative"
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
                        <p className="text-[10px] text-gray-500 mt-0.5">{user.public_repos} repos</p>
                      </div>
                      <a
                        href={`https://github.com/${user.login}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="absolute top-2.5 right-2.5 p-1 rounded text-gray-500 hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-all"
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
