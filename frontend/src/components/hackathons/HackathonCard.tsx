import { memo } from 'react';
import { Calendar, MapPin, Trophy, Users, Clock, ArrowUpRight } from 'lucide-react';
import type { Hackathon } from '../../types/hackathon';

interface HackathonCardProps {
  hackathon: Hackathon;
}

const isSafeUrl = (url: string | undefined) => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch { return false; }
};

// Red only when it is genuinely last-minute; amber for the final week.
function getDaysInfo(endDate: string) {
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
  if (diff < 0) return { label: 'Ended', tone: 'ended' as const };
  if (diff === 0) return { label: 'Ends today', tone: 'critical' as const };
  if (diff === 1) return { label: '1 day left', tone: 'critical' as const };
  if (diff <= 7) return { label: `${diff} days left`, tone: 'soon' as const };
  return { label: `${diff} days left`, tone: 'normal' as const };
}

const SOURCE_COLORS: Record<string, string> = {
  devpost: 'text-blue-400 bg-blue-400/[0.07] border-blue-400/20',
  mlh: 'text-red-400 bg-red-400/[0.07] border-red-400/20',
  devfolio: 'text-blue-400 bg-blue-400/[0.07] border-blue-400/20',
};

export const HackathonCard = memo(function HackathonCard({ hackathon }: HackathonCardProps) {
  const safeUrl = isSafeUrl(hackathon.url);
  const { label: daysLabel, tone } = getDaysInfo(hackathon.endDate);
  const sourceClass = SOURCE_COLORS[hackathon.source?.toLowerCase()] ?? 'text-gray-400 bg-white/[0.04] border-white/[0.08]';

  const urgentBadge = {
    critical: 'text-red-300 bg-red-400/[0.08] border-red-400/25',
    soon: 'text-amber-300 bg-amber-400/[0.08] border-amber-400/25',
    ended: 'text-gray-500 bg-white/[0.04] border-white/[0.07]',
    normal: 'text-gray-300 bg-white/[0.04] border-white/[0.08]',
  }[tone];

  return (
    <div className={`group relative flex flex-col rounded-xl border border-white/[0.07] bg-[#2E3245] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-[background-color,border-color,box-shadow,transform] duration-200 ${safeUrl ? 'hover:border-white/[0.14] hover:bg-[#31364C] hover:-translate-y-px hover:shadow-[0_12px_24px_-12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]' : ''} ${tone === 'ended' ? 'opacity-60' : ''}`}>

      {/* Top row: title + source badge + external link */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div className="min-w-0">
            {safeUrl ? (
              <a
                href={hackathon.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[15px] font-semibold text-white group-hover:text-blue-200 transition-colors leading-snug line-clamp-2 after:absolute after:inset-0 after:rounded-xl"
              >
                {hackathon.title}
              </a>
            ) : (
              <span className="text-sm font-semibold text-white leading-snug line-clamp-2">{hackathon.title}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hackathon.source && (
            <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-md border ${sourceClass}`}>
              {hackathon.source}
            </span>
          )}
          {safeUrl && (
            <a
              href={hackathon.url}
              target="_blank"
              rel="noopener noreferrer"
              tabIndex={-1}
              aria-hidden="true"
              className="relative w-7 h-7 flex items-center justify-center rounded-md text-gray-500 group-hover:text-white transition-all [@media(hover:hover)]:opacity-0 group-hover:opacity-100"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Description */}
      {hackathon.description && (
        <p className="text-[13px] text-gray-400 line-clamp-2 mb-4 leading-relaxed">{hackathon.description}</p>
      )}

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3">
        {/* Time remaining — badge */}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${urgentBadge}`}>
          <Clock className="w-3 h-3" />
          {daysLabel}
        </span>

        <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <Calendar className="w-3 h-3 text-gray-600" />
          Ends {hackathon.endDate}
        </span>

        {hackathon.location && (
          <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <MapPin className="w-3 h-3 text-gray-600" />
            {hackathon.location}
          </span>
        )}

        {hackathon.prize && (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-200">
            <Trophy className="w-3 h-3 text-amber-400" />
            {hackathon.prize}
          </span>
        )}

        {hackathon.participantCount !== undefined && (
          <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <Users className="w-3 h-3 text-gray-600" />
            {hackathon.participantCount.toLocaleString()} participants
          </span>
        )}
      </div>

      {/* Tags */}
      {hackathon.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-auto">
          {hackathon.tags.slice(0, 6).map(tag => (
            <span
              key={tag}
              className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-white/[0.05] border border-white/[0.07] text-gray-400"
            >
              {tag}
            </span>
          ))}
          {hackathon.tags.length > 6 && (
            <span className="text-[10px] text-gray-600 self-center">+{hackathon.tags.length - 6}</span>
          )}
        </div>
      )}
    </div>
  );
});
