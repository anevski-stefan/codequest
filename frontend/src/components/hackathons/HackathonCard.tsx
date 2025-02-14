import { memo, useEffect } from 'react';
import { Calendar, MapPin, Trophy, Users, Clock, ExternalLink } from 'lucide-react';
import { InfoItem } from './InfoItem';
import { Tag } from './Tag';
import { SourceBadge } from './SourceBadge';
import type { Hackathon } from '../../types/hackathon';

interface HackathonCardProps {
  hackathon: Hackathon;
}

export const HackathonCard = memo(function HackathonCard({ hackathon }: HackathonCardProps) {
  useEffect(() => {
    console.log('Hackathon dates:', {
      title: hackathon.title,
      startDate: hackathon.startDate,
      parsedStartDate: new Date(hackathon.startDate),
      endDate: hackathon.endDate,
      parsedEndDate: new Date(hackathon.endDate)
    });
  }, [hackathon]);

  console.log('Hackathon data:', hackathon);

  const getDaysToDeadline = () => {
    const deadline = new Date(hackathon.endDate);
    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Ended';
    if (diffDays === 0) return 'Ends today';
    if (diffDays === 1) return '1 day remaining';
    return `${diffDays} days remaining`;
  };

  const isUrgentDeadline = () => {
    const deadline = new Date(hackathon.endDate);
    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  };

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-100 dark:border-gray-700">
      <div className="p-6">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {hackathon.title}
            </h3>
            <p className="mt-2 text-base leading-relaxed text-gray-600 dark:text-gray-300 line-clamp-2">
              {hackathon.description}
            </p>
          </div>
          <SourceBadge source={hackathon.source} />
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoItem 
            icon={Clock} 
            text={getDaysToDeadline()} 
            isDeadline={true}
            isUrgent={isUrgentDeadline()}
          />
          <InfoItem icon={Calendar} text={hackathon.startDate} />
          {hackathon.location && (
            <InfoItem icon={MapPin} text={hackathon.location} />
          )}
          {hackathon.prize && (
            <InfoItem icon={Trophy} text={hackathon.prize} />
          )}
          {hackathon.participantCount !== undefined && (
            <InfoItem icon={Users} text={`${hackathon.participantCount} participants`} />
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {hackathon.tags.map((tag) => (
            <Tag key={tag} text={tag} />
          ))}
        </div>
      </div>

      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700">
        <a
          href={hackathon.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold transition-colors"
        >
          View Details
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}); 