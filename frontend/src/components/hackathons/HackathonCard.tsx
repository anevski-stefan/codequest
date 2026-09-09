import { memo } from 'react';
import { Calendar, MapPin, Trophy, Users, Clock, ExternalLink } from 'lucide-react';
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

function getDaysLabel(endDate: string) {
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
  if (diff < 0) return { label: 'Ended', urgent: false };
  if (diff === 0) return { label: 'Ends today', urgent: true };
  if (diff === 1) return { label: '1 day left', urgent: true };
  if (diff <= 7) return { label: `${diff} days left`, urgent: true };
  return { label: `${diff} days left`, urgent: false };
}

const SOURCE_COLORS: Record<string, string> = {
  devpost: 'text-blue-400 bg-blue-400/[0.08] border-blue-400/20',
  mlh: 'text-red-400 bg-red-400/[0.08] border-red-400/20',
  devfolio: 'text-violet-400 bg-violet-400/[0.08] border-violet-400/20',
};

export const HackathonCard = memo(function HackathonCard({ hackathon }: HackathonCardProps) {
  const safeUrl = isSafeUrl(hackathon.url);
  const { label: daysLabel, urgent } = getDaysLabel(hackathon.endDate);
  const sourceClass = SOURCE_COLORS[hackathon.source?.toLowerCase()] ?? 'text-gray-400 bg-white/[0.04] border-white/[0.08]';

  return (
    <div className="group px-6 py-5 hover:bg-white/[0.02] transition-colors">
      {/* Top row: title + source + link */}
      <div className="flex items-start justify-between gap-4 mb-1.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {safeUrl ? (
            <a
              href={hackathon.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-gray-200 hover:text-white transition-colors truncate leading-snug"
            >
              {hackathon.title}
            </a>
          ) : (
            <span className="text-sm font-semibold text-gray-200 truncate leading-snug">{hackathon.title}</span>
          )}
          {hackathon.source && (
            <span className={`shrink-0 inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-md border ${sourceClass}`}>
              {hackathon.source}
            </span>
          )}
        </div>
        {safeUrl && (
          <a
            href={hackathon.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 p-1 text-gray-700 hover:text-gray-300 transition-colors opacity-0 group-hover:opacity-100"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-gray-500 line-clamp-1 mb-3">{hackathon.description}</p>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-3">
        <span className={`flex items-center gap-1.5 text-xs font-medium ${urgent ? 'text-red-400' : 'text-gray-500'}`}>
          <Clock className={`w-3 h-3 ${urgent ? 'text-red-400' : 'text-gray-600'}`} />
          {daysLabel}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <Calendar className="w-3 h-3" />
          {hackathon.startDate}
        </span>
        {hackathon.location && (
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <MapPin className="w-3 h-3" />
            {hackathon.location}
          </span>
        )}
        {hackathon.prize && (
          <span className="flex items-center gap-1.5 text-xs text-amber-500">
            <Trophy className="w-3 h-3" />
            {hackathon.prize}
          </span>
        )}
        {hackathon.participantCount !== undefined && (
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <Users className="w-3 h-3" />
            {hackathon.participantCount.toLocaleString()} participants
          </span>
        )}
      </div>

      {/* Tags */}
      {hackathon.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {hackathon.tags.slice(0, 6).map(tag => (
            <span
              key={tag}
              className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-white/[0.04] border border-white/[0.06] text-gray-500"
            >
              {tag}
            </span>
          ))}
          {hackathon.tags.length > 6 && (
            <span className="text-[10px] text-gray-700 self-center">+{hackathon.tags.length - 6}</span>
          )}
        </div>
      )}
    </div>
  );
});
