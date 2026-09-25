import { useState, useMemo, useEffect, useRef, type CSSProperties } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, Users, FolderGit2, X, ArrowUpRight, SearchX } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useDebounce } from '../../hooks/useDebounce';
import { api, searchTopContributors } from '../../services/github';
import type { GithubUser, GitHubRepository as Repository } from '../../types/github';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import EmptyState from '../../components/ui/EmptyState';
import LoadMoreButton from '../../components/ui/LoadMoreButton';
import FilterChip from '../../components/ui/FilterChip';
import { Skeleton } from '../../components/ui/Skeleton';
import { easeOut } from '../../lib/motion';
import RepoResultCard from './components/RepoResultCard';
import ExploreHome from './components/ExploreHome';

type Tab = 'repos' | 'people';

const SORTS = [
  { value: '', label: 'Best match' },
  { value: 'stars', label: 'Most stars' },
  { value: 'updated', label: 'Recently updated' },
];

const PER_PAGE = 30;
// GitHub search never returns more than the first 1000 results.
const SEARCH_CAP = 1000;

const QUALIFIER = /^(language|topic|stars):/;

const Explore = () => {
  usePageTitle('Explore');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [params, setParams] = useSearchParams();

  // The URL is the source of truth, so back/forward and shared links work.
  const q = params.get('q') ?? '';
  const tab: Tab = params.get('type') === 'people' ? 'people' : 'repos';
  const sort = params.get('sort') ?? '';

  const [draft, setDraft] = useState(q);
  const debounced = useDebounce(draft, 350);

  const update = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    setParams(p, { replace: true });
  };

  // Pull external URL changes (back/forward, topic clicks) into the input,
  // but don't clobber what the user is typing (e.g. a trailing space).
  useEffect(() => {
    setDraft(d => (d.trim() === q ? d : q));
  }, [q]);
  useEffect(() => {
    if (debounced.trim() !== q) update({ q: debounced.trim() || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  // "/" focuses search from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const search = (query: string, opts?: { sort?: string }) => {
    setDraft(query);
    update({ q: query || null, type: null, sort: opts?.sort || null });
  };

  const repoQuery = useInfiniteQuery({
    queryKey: ['repositories', q, sort],
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<{ items: Repository[]; total_count: number }>('/api/github/search/repositories', {
        params: { q, per_page: PER_PAGE, page: pageParam, ...(sort ? { sort, order: 'desc' } : {}) },
      });
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (last, all) => {
      const loaded = all.length * PER_PAGE;
      return loaded < Math.min(last.total_count, SEARCH_CAP) ? all.length + 1 : undefined;
    },
    enabled: tab === 'repos' && !!q,
    staleTime: 5 * 60 * 1000,
  });

  const peopleQuery = useInfiniteQuery({
    queryKey: ['contributors', q],
    queryFn: ({ pageParam }) => searchTopContributors(q || 'followers:>1000', pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (last.hasMore ? all.length + 1 : undefined),
    enabled: tab === 'people',
    staleTime: 5 * 60 * 1000,
  });

  const repos = useMemo(() => repoQuery.data?.pages.flatMap(p => p.items) ?? [], [repoQuery.data]);
  const total = repoQuery.data?.pages[0]?.total_count ?? 0;
  const people = useMemo(() => peopleQuery.data?.pages.flatMap(p => p.users) ?? [], [peopleQuery.data]);

  const qualifiers = q.split(/\s+/).filter(t => QUALIFIER.test(t));
  const removeToken = (token: string) => search(q.split(/\s+/).filter(t => t !== token).join(' '), { sort });

  const showHome = tab === 'repos' && !q;
  const busy = tab === 'repos' ? repoQuery.isFetching && !repoQuery.isFetchingNextPage : peopleQuery.isFetching && !peopleQuery.isFetchingNextPage;
  const error = (tab === 'repos' ? repoQuery.error : peopleQuery.error) as (Error & { response?: { status?: number } }) | null;
  const rateLimited = error?.response?.status === 403 || error?.response?.status === 429 || /rate limit/i.test(error?.message ?? '');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header: one search box for every state, so focus is never lost ── */}
      <header className="relative shrink-0 px-6 lg:px-8 pt-7 pb-4 border-b border-white/[0.05] overflow-hidden">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none [mask-image:radial-gradient(ellipse_60%_100%_at_20%_0%,black,transparent)]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
          aria-hidden="true"
        />
        <div className="relative max-w-[1400px]">
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: easeOut }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-400/80 mb-1.5">Discover</p>
            <h1 className="text-2xl font-bold tracking-tight text-white">Explore open source</h1>
            <p className="text-sm text-gray-500 mt-1">Find a repository worth contributing to, or someone worth learning from.</p>
          </motion.div>

          <div className="mt-5 flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1 max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              <input
                ref={inputRef}
                type="search"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') { setDraft(''); inputRef.current?.blur(); } }}
                placeholder={tab === 'repos' ? 'Search repositories, e.g. "markdown editor" or language:rust' : 'Search people by username'}
                aria-label={tab === 'repos' ? 'Search repositories' : 'Search people'}
                className="w-full h-12 pl-11 pr-24 text-[14px] bg-[#2E3245] border border-white/[0.1] rounded-xl text-gray-100 placeholder-gray-500 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] focus:outline-none focus-visible:outline-none focus:border-blue-500/50 focus:shadow-[0_0_0_4px_rgba(59,123,255,0.12)] transition-all [&::-webkit-search-cancel-button]:hidden"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {busy && <span className="w-4 h-4 rounded-full border-[1.5px] border-white/15 border-t-blue-400 animate-spin" aria-label="Searching" />}
                {draft ? (
                  <button onClick={() => { setDraft(''); inputRef.current?.focus(); }} aria-label="Clear search" className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="kbd hidden sm:inline-flex">/</span>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div role="tablist" aria-label="Search type" className="flex md:inline-flex items-center h-12 p-1 rounded-xl border border-white/[0.09] bg-[#252836] w-full md:w-auto">
              {([['repos', 'Repositories', FolderGit2], ['people', 'People', Users]] as const).map(([id, label, Icon]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => update({ type: id === 'people' ? 'people' : null, sort: null })}
                  className={`relative flex-1 md:flex-none h-full flex items-center justify-center gap-2 px-4 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${tab === id ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  {tab === id && (
                    <motion.span layoutId="explore-tab" className="absolute inset-0 rounded-lg bg-[#363B52] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_1px_2px_rgba(0,0,0,0.3)]" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
                  )}
                  <Icon className="relative w-4 h-4" />
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Result toolbar */}
          {tab === 'repos' && q && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <p className="text-[12px] text-gray-500 mr-1" aria-live="polite">
                {repoQuery.isLoading ? 'Searching' : <><span className="text-gray-300 font-semibold tabular">{total.toLocaleString()}</span> repositories</>}
              </p>
              {qualifiers.map(t => (
                <span key={t} className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-lg border border-blue-500/30 bg-blue-500/[0.08] text-[11px] font-semibold text-blue-200">
                  {t.replace(':', ': ')}
                  <button onClick={() => removeToken(t)} aria-label={`Remove ${t}`} className="w-5 h-5 flex items-center justify-center rounded hover:bg-blue-400/20 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <div className="ml-auto w-48">
                <FilterChip prefix="Sort" options={SORTS} value={sort} onChange={v => update({ sort: v || null })} />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">
        {showHome ? (
          <ExploreHome onSearch={search} onPeople={() => update({ type: 'people' })} />
        ) : error ? (
          <div className="p-6 max-w-2xl">
            <ErrorDisplay
              title={rateLimited ? 'GitHub rate limit reached' : 'Search failed'}
              error={rateLimited ? 'GitHub is limiting search requests. Wait a minute and try again.' : error.message}
              onRetry={() => (tab === 'repos' ? repoQuery.refetch() : peopleQuery.refetch())}
            />
          </div>
        ) : tab === 'repos' ? (
          repoQuery.isLoading ? (
            <div className="px-6 lg:px-8 py-5 grid grid-cols-1 lg:grid-cols-2 gap-2.5" role="status" aria-label="Loading repositories">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-white/[0.06] bg-[#2E3245]/60 p-4 space-y-3">
                  <div className="flex items-center gap-3"><Skeleton className="w-9 h-9 rounded-lg" /><Skeleton className="h-4 w-48" /><Skeleton className="ml-auto h-6 w-14 rounded-md" /></div>
                  <Skeleton className="h-3 w-5/6" />
                  <div className="flex gap-1.5"><Skeleton className="h-6 w-16 rounded-md" /><Skeleton className="h-6 w-20 rounded-md" /></div>
                </div>
              ))}
            </div>
          ) : repos.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={`No repositories match "${q}"`}
              subtitle="Try fewer words, remove a filter, or search by topic instead."
              action={
                <button onClick={() => search('')} className="h-9 px-4 rounded-lg border border-white/[0.1] text-[13px] font-semibold text-gray-300 hover:text-white hover:border-white/[0.2] transition-colors cursor-pointer">
                  Back to Explore
                </button>
              }
            />
          ) : (
            <>
              <div className="px-6 lg:px-8 py-5 grid grid-cols-1 lg:grid-cols-2 gap-2.5 max-w-[1400px]">
                {repos.map((repo, i) => (
                  <RepoResultCard key={repo.id} repo={repo} index={i} onTopic={t => search(`topic:${t}`, { sort: 'stars' })} />
                ))}
              </div>
              {repoQuery.hasNextPage && <LoadMoreButton onClick={() => repoQuery.fetchNextPage()} isLoading={repoQuery.isFetchingNextPage} />}
            </>
          )
        ) : (
          /* People */
          peopleQuery.isLoading ? (
            <div className="px-6 lg:px-8 py-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5" role="status" aria-label="Loading people">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-3 p-5 rounded-xl border border-white/[0.06] bg-[#2E3245]/60">
                  <Skeleton className="w-16 h-16 rounded-full" /><Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          ) : people.length === 0 ? (
            <EmptyState icon={Users} title={`Nobody found for "${q}"`} subtitle="Check the spelling of the username, or clear the search to see well-known developers." />
          ) : (
            <>
              <div className="px-6 lg:px-8 pt-5 pb-1">
                <p className="text-[12px] text-gray-500">{q ? 'Matching developers' : 'Developers with the largest followings on GitHub'}</p>
              </div>
              <div className="px-6 lg:px-8 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5 max-w-[1400px]">
                {people.map((user: GithubUser, i) => (
                  <div
                    key={user.id}
                    role="link"
                    tabIndex={0}
                    onClick={() => navigate(`/contributors/${user.login}`)}
                    onKeyDown={e => { if (e.key === 'Enter') navigate(`/contributors/${user.login}`); }}
                    style={{ '--i': i % 30 } as CSSProperties}
                    className="reveal group relative flex flex-col items-center gap-3 p-5 rounded-xl border border-white/[0.07] bg-[#2E3245] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-white/[0.14] hover:bg-[#31364C] hover:-translate-y-px transition-[background-color,border-color,transform] duration-200 cursor-pointer"
                  >
                    <img src={user.avatar_url} alt="" width={64} height={64} loading="lazy" decoding="async" className="w-16 h-16 rounded-full ring-2 ring-white/[0.06] group-hover:ring-blue-400/40 transition-all" />
                    <div className="text-center min-w-0 w-full">
                      <p className="text-[13px] font-semibold text-gray-200 group-hover:text-white truncate transition-colors">{user.login}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 group-hover:text-blue-300 transition-colors">View profile</p>
                    </div>
                    <a
                      href={`https://github.com/${user.login}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      aria-label={`${user.login} on GitHub`}
                      className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:text-white hover:bg-white/[0.06] [@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
              {peopleQuery.hasNextPage && <LoadMoreButton onClick={() => peopleQuery.fetchNextPage()} isLoading={peopleQuery.isFetchingNextPage} />}
            </>
          )
        )}
      </div>
    </div>
  );
};

export default Explore;
