import type { CSSProperties, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Hash, Sparkles, Users } from 'lucide-react';
import { searchTopContributors } from '../../../services/github';
import { LANGUAGE_COLORS } from '../../../constants/languageColors';
import { Skeleton } from '../../../components/ui/Skeleton';

// Shown when the search box is empty: ways in, not a blank page.

const LANGUAGES = [
  { name: 'TypeScript', q: 'typescript', blurb: 'Web apps, tooling, frameworks' },
  { name: 'Python', q: 'python', blurb: 'Data, ML, backends, scripts' },
  { name: 'Rust', q: 'rust', blurb: 'Systems, CLIs, fast tooling' },
  { name: 'Go', q: 'go', blurb: 'Cloud, infra, command line' },
  { name: 'JavaScript', q: 'javascript', blurb: 'Browsers, Node, UI libraries' },
  { name: 'Java', q: 'java', blurb: 'Enterprise, Android, big data' },
  { name: 'C++', q: 'c++', blurb: 'Engines, databases, compilers' },
  { name: 'Ruby', q: 'ruby', blurb: 'Rails apps and dev tooling' },
];

const TOPICS = ['cli', 'react', 'machine-learning', 'database', 'game-engine', 'devtools', 'static-site', 'education', 'compiler', 'tui'];

const STARTER_REPOS = [
  { name: 'rust-lang/rustlings', why: 'Small, well-scoped exercises and docs fixes', tag: 'Rust' },
  { name: 'freeCodeCamp/freeCodeCamp', why: 'Large maintainer team and a clear contributing guide', tag: 'TypeScript' },
  { name: 'vercel/next.js', why: 'Frequent good first issues in docs and examples', tag: 'TypeScript' },
  { name: 'supabase/supabase', why: 'Active triage and friendly reviews', tag: 'TypeScript' },
  { name: 'django/django', why: 'Mentored tickets and detailed code review', tag: 'Python' },
  { name: 'excalidraw/excalidraw', why: 'Visual, self-contained UI issues', tag: 'TypeScript' },
];

const SectionTitle = ({ icon: Icon, title, action }: { icon: typeof Hash; title: string; action?: ReactNode }) => (
  <div className="flex items-center justify-between mb-3">
    <h2 className="flex items-center gap-2 text-[13px] font-semibold text-gray-200">
      <Icon className="w-3.5 h-3.5 text-gray-500" />{title}
    </h2>
    {action}
  </div>
);

interface Props {
  onSearch: (q: string, opts?: { sort?: string }) => void;
  onPeople: () => void;
}

const ExploreHome = ({ onSearch, onPeople }: Props) => {
  const navigate = useNavigate();
  const people = useQuery({
    queryKey: ['explore-top-people'],
    queryFn: () => searchTopContributors('followers:>1000', 1),
    staleTime: 30 * 60 * 1000,
  });

  return (
    <div className="px-6 lg:px-8 py-6 space-y-10 max-w-[1400px]">
      {/* First contribution picks — the main reason people come here */}
      <section className="reveal" style={{ '--i': 0 } as CSSProperties}>
        <SectionTitle icon={Sparkles} title="Good places for a first contribution" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {STARTER_REPOS.map(r => {
            const [owner, name] = r.name.split('/');
            return (
              <button
                key={r.name}
                onClick={() => navigate(`/explore/${r.name}`)}
                className="group flex items-start gap-3 p-4 rounded-xl border border-white/[0.07] bg-[#2E3245] text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-white/[0.14] hover:bg-[#31364C] hover:-translate-y-px transition-[background-color,border-color,transform] duration-200 cursor-pointer"
              >
                <img src={`https://github.com/${owner}.png?size=64`} alt="" width={36} height={36} loading="lazy" className="w-9 h-9 rounded-lg bg-white/[0.06] ring-1 ring-white/[0.08] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-gray-100 group-hover:text-white truncate transition-colors">
                    <span className="text-gray-500 font-normal">{owner}/</span>{name}
                  </p>
                  <p className="text-[12px] text-gray-400 mt-1 leading-relaxed line-clamp-2">{r.why}</p>
                  <span className="inline-flex items-center gap-1.5 mt-2.5 text-[11px] text-gray-500">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: LANGUAGE_COLORS[r.tag] }} />{r.tag}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-gray-300 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
              </button>
            );
          })}
        </div>
      </section>

      {/* Languages */}
      <section className="reveal" style={{ '--i': 3 } as CSSProperties}>
        <SectionTitle icon={Hash} title="Browse by language" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {LANGUAGES.map(l => {
            const color = LANGUAGE_COLORS[l.name] ?? '#6b7280';
            return (
              <button
                key={l.name}
                onClick={() => onSearch(`language:${l.q} stars:>500`, { sort: 'stars' })}
                className="group relative overflow-hidden p-4 rounded-xl border border-white/[0.07] bg-[#2E3245] text-left hover:border-white/[0.16] hover:bg-[#31364C] transition-colors cursor-pointer"
              >
                <span
                  className="absolute -top-10 -right-10 w-24 h-24 rounded-full opacity-[0.12] group-hover:opacity-25 blur-2xl transition-opacity"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <span className="relative flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[14px] font-semibold text-gray-100">{l.name}</span>
                </span>
                <span className="relative block text-[12px] text-gray-500 mt-1.5 leading-snug">{l.blurb}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Topics */}
      <section className="reveal" style={{ '--i': 5 } as CSSProperties}>
        <SectionTitle icon={Hash} title="Popular topics" />
        <div className="flex flex-wrap gap-2">
          {TOPICS.map(t => (
            <button
              key={t}
              onClick={() => onSearch(`topic:${t}`, { sort: 'stars' })}
              className="h-8 px-3 rounded-full border border-white/[0.08] bg-white/[0.03] text-[12px] font-medium text-gray-300 hover:text-white hover:border-blue-500/35 hover:bg-blue-500/[0.08] active:scale-[0.97] transition-all cursor-pointer"
            >
              <span className="text-gray-500 mr-0.5">#</span>{t}
            </button>
          ))}
        </div>
      </section>

      {/* People */}
      <section className="reveal" style={{ '--i': 7 } as CSSProperties}>
        <SectionTitle
          icon={Users}
          title="Developers to learn from"
          action={
            <button onClick={onPeople} className="group flex items-center gap-1 text-[12px] font-semibold text-gray-500 hover:text-blue-300 transition-colors cursor-pointer">
              See all<ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          }
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {people.isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/[0.06] bg-[#2E3245]/60">
                <Skeleton className="w-12 h-12 rounded-full" /><Skeleton className="h-3 w-16" />
              </div>
            ))
            : (people.data?.users ?? []).slice(0, 6).map(u => (
              <button
                key={u.id}
                onClick={() => navigate(`/contributors/${u.login}`)}
                className="group flex flex-col items-center gap-2 p-4 rounded-xl border border-white/[0.07] bg-[#2E3245] hover:border-white/[0.14] hover:bg-[#31364C] transition-colors cursor-pointer"
              >
                <img src={u.avatar_url} alt="" width={48} height={48} loading="lazy" className="w-12 h-12 rounded-full ring-2 ring-white/[0.06] group-hover:ring-blue-400/40 transition-all" />
                <span className="text-[13px] font-medium text-gray-300 group-hover:text-white truncate max-w-full transition-colors">{u.login}</span>
              </button>
            ))}
        </div>
      </section>
    </div>
  );
};

export default ExploreHome;
