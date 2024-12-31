import { memo } from 'react';
import { Calendar, MapPin, Trophy } from 'lucide-react';
import { InfoItem } from './InfoItem';
import { Tag } from './Tag';
import { SourceBadge } from './SourceBadge';
import type { Hackathon } from '../../types/hackathon';

interface HackathonCardProps {
  hackathon: Hackathon;
}

export const HackathonCard = memo(function HackathonCard({ hackathon }: HackathonCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-start">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          {hackathon.title}
        </h3>
        <SourceBadge source={hackathon.source} />
      </div>
      
      <p className="mt-2 text-gray-600 dark:text-gray-300">{hackathon.description}</p>
      
      <div className="mt-4 flex flex-wrap gap-4">
        <InfoItem icon={Calendar} text={hackathon.startDate} />
        {hackathon.location && (
          <InfoItem icon={MapPin} text={hackathon.location} />
        )}
        {hackathon.prize && (
          <InfoItem icon={Trophy} text={hackathon.prize} />
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {hackathon.tags.map((tag) => (
          <Tag key={tag} text={tag} />
        ))}
      </div>

      <a
        href={hackathon.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        View Details
      </a>
    </div>
  );
}); 