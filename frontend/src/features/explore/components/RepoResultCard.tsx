import { memo, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, GitFork, ArrowUpRight, CircleDot } from 'lucide-react';
import type { GitHubRepository as Repository } from '../../../types/github';
import { LANGUAGE_COLORS } from '../../../constants/languageColors';
import { formatCount } from '../../../utils/formatCount';
import { formatRelativeDate } from '../../../utils/formatDate';

interface Props {
  repo: Repository;
  index: number;
  onTopic: (topic: string) => void;
}

const RepoResultCard = memo(({ repo, index, onTopic }: Props) => {
  const navigate = useNavigate();
  const [owner, name] = repo.full_name.split('/');
  const langColor = LANGUAGE_COLORS[repo.language] ?? '#6b7280';
  const open = () => navigate(`/explore/${owner}/${name}`);

  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={repo.full_name}
      onClick={open}
      onKeyDown={e => { if (e.key === 'Enter') open(); }}
      style={{ '--i': index % 30 } as CSSProperties}
      className="reveal group relative flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-[#2E3245] p-4 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-white/[0.14] hover:bg-[#31364C] hover:-translate-y-px hover:shadow-[0_12px_24px_-12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-0 transition-[background-color,border-color,box-shadow,transform] duration-200"
    >
      <div className="flex items-start gap-3">
        <img
          src={repo.owner.avatar_url}
          alt=""
          width={36}
          height={36}
          loading="lazy"
          decoding="async"
          className="w-9 h-9 rounded-lg shrink-0 bg-white/[0.06] ring-1 ring-white/[0.08]"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-gray-100 group-hover:text-white truncate transition-colors">
            <span className="text-gray-500 font-normal">{owner}/</span>{name}
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">Updated {formatRelativeDate(repo.updated_at)}</p>
        </div>
        <span className="inline-flex items-center gap-1 h-6 px-2 rounded-md border border-amber-400/20 bg-amber-400/[0.07] text-[11px] font-semibold text-amber-300/90 shrink-0 tabular" title={`${repo.stargazers_count.toLocaleString()} stars`}>
          <Star className="w-3 h-3 fill-current" />{formatCount(repo.stargazers_count)}
        </span>
      </div>

      {repo.description && (
        <p className="text-[13px] text-gray-400 leading-relaxed line-clamp-2">{repo.description}</p>
      )}

      {repo.topics?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {repo.topics.slice(0, 4).map(t => (
            <button
              key={t}
              onClick={e => { e.stopPropagation(); onTopic(t); }}
              className="relative h-6 px-2 rounded-md bg-blue-500/[0.08] border border-blue-500/[0.18] text-[11px] font-medium text-blue-300 hover:bg-blue-500/[0.15] hover:text-blue-200 transition-colors cursor-pointer"
              title={`Search topic:${t}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center gap-4 text-[12px] text-gray-500">
        {repo.language && (
          <span className="inline-flex items-center gap-1.5 text-gray-400">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: langColor }} />
            {repo.language}
          </span>
        )}
        <span className="inline-flex items-center gap-1 tabular"><GitFork className="w-3.5 h-3.5" />{formatCount(repo.forks_count)}</span>
        {repo.open_issues_count > 0 && (
          <span className="inline-flex items-center gap-1 tabular"><CircleDot className="w-3.5 h-3.5 text-green-400/70" />{formatCount(repo.open_issues_count)} open</span>
        )}
        <a
          href={repo.html_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          aria-label="Open on GitHub"
          className="ml-auto -my-1 -mr-1 w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:text-white hover:bg-white/[0.06] [@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </article>
  );
});

RepoResultCard.displayName = 'RepoResultCard';
export default RepoResultCard;
