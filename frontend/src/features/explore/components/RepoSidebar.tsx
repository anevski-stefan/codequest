import { Link } from 'react-router-dom';
import { BookOpen, Sparkles, ArrowUpRight, HandHeart } from 'lucide-react';
import type { GitHubRepository as Repository } from '../../../types/github';
import type { TopContributor } from '../types';

interface RepoSidebarProps {
  repository: Repository;
  topContributors?: TopContributor[];
  onOnboard: () => void;
  isOnboarding: boolean;
}

export function RepoSidebar({ repository, topContributors, onOnboard, isOnboarding }: RepoSidebarProps) {
  return (
    <aside className="w-full lg:w-72 shrink-0 px-6 lg:pl-0 pb-8 space-y-4">
      {/* Start here */}
      <div className="rounded-xl border border-blue-500/20 bg-gradient-to-b from-blue-500/[0.07] to-transparent p-4">
        <p className="text-sm font-semibold text-white">New to this repo?</p>
        <p className="text-[12px] text-gray-400 mt-1 leading-relaxed">
          Get a short guide to the folders, setup and conventions before you pick an issue.
        </p>
        <button
          onClick={onOnboard}
          disabled={isOnboarding}
          className="mt-3 w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-[13px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] active:scale-[0.98] disabled:opacity-60 transition-all cursor-pointer"
        >
          {isOnboarding ? <span className="w-3.5 h-3.5 rounded-full border-[1.5px] border-white/30 border-t-white animate-spin" /> : <BookOpen className="w-3.5 h-3.5" />}
          {isOnboarding ? 'Writing guide' : 'Generate onboarding guide'}
          {!isOnboarding && <Sparkles className="w-3 h-3 opacity-70" />}
        </button>
        <a
          href={`${repository.html_url}/contribute`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 w-full flex items-center justify-center gap-1.5 h-9 rounded-lg border border-white/[0.09] text-[12px] font-semibold text-gray-300 hover:text-white hover:border-white/[0.18] transition-all"
        >
          <HandHeart className="w-3.5 h-3.5" />
          Good first issues on GitHub
          <ArrowUpRight className="w-3 h-3 text-gray-500" />
        </a>
      </div>

      {topContributors && topContributors.length > 0 && (
        <div className="rounded-xl bg-[#2E3245] border border-white/[0.07] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.14em] mb-3">Top contributors</p>
          <div className="space-y-0.5">
            {topContributors.map(c => (
              <Link
                key={c.login}
                to={`/contributors/${c.login}`}
                className="flex items-center gap-2.5 -mx-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
              >
                <img src={c.avatar_url} alt="" width={28} height={28} loading="lazy" decoding="async" className="w-7 h-7 rounded-full shrink-0 ring-1 ring-white/10" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-200 truncate">{c.login}</p>
                  <p className="text-[11px] text-gray-500 tabular">{c.contributions.toLocaleString()} commits</p>
                </div>
                <span className="text-[11px] text-gray-500 shrink-0 tabular">{c.percentage}%</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
