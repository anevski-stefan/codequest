import { Star, GitFork, Eye, Scale } from 'lucide-react';
import type { GitHubRepository as Repository } from '../../../types/github';
import type { TopContributor } from '../types';
import { formatCount } from '../../../utils/formatCount';

interface RepoSidebarProps {
  repository: Repository;
  topContributors?: TopContributor[];
}

export function RepoSidebar({ repository, topContributors }: RepoSidebarProps) {
  return (
    <div className="w-64 shrink-0 pr-6 pt-0 pb-8 space-y-4">

      <div className="rounded-xl bg-[#0D1525] border border-white/[0.07] p-4">
        <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-widest mb-3">About</p>
        {repository.description && (
          <p className="text-xs text-gray-500 leading-relaxed mb-3">{repository.description}</p>
        )}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Star className="w-3.5 h-3.5 text-amber-500/70" />
            {repository.stargazers_count.toLocaleString()} stars
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <GitFork className="w-3.5 h-3.5" />{formatCount(repository.forks_count)} forks
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Eye className="w-3.5 h-3.5" />{formatCount(repository.watchers_count)} watchers
          </div>
          {repository.license && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Scale className="w-3.5 h-3.5" />{repository.license.name}
            </div>
          )}
        </div>
      </div>

      {topContributors && topContributors.length > 0 && (
        <div className="rounded-xl bg-[#0D1525] border border-white/[0.07] p-4">
          <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-widest mb-3">Top Contributors</p>
          <div className="space-y-2">
            {topContributors.map(c => (
              <div key={c.login} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors">
                <img src={c.avatar_url} alt={c.login} width={28} height={28} loading="lazy" decoding="async"
                  className="w-7 h-7 rounded-full shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-300 truncate">{c.login}</p>
                  <p className="text-[10px] text-gray-700">{c.contributions} commits</p>
                </div>
                <span className="text-[10px] text-gray-600 shrink-0">{c.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
