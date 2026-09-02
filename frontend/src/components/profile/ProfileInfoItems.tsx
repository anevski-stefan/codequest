import { Calendar, MapPin, Link as LinkIcon, Building, X } from 'lucide-react';

const VALID_URL_SCHEMES = ['http', 'https', 'mailto'];
const formatUrl = (url: string) => {
  if (!url) return '';
  const trimmed = url.trim();
  const schemeMatch = trimmed.match(/^([a-z][a-z0-9+.-]*):/i);
  if (schemeMatch) {
    return VALID_URL_SCHEMES.includes(schemeMatch[1].toLowerCase()) ? trimmed : '#';
  }
  return `https://${trimmed}`;
};

interface ProfileInfoItemsProps {
  company?: string | null;
  location?: string | null;
  blog?: string | null;
  twitter_username?: string | null;
  created_at: string;
}

const ProfileInfoItems = ({ company, location, blog, twitter_username, created_at }: ProfileInfoItemsProps) => (
  <div className="mt-6 w-full space-y-3">
    {company && (
      <div className="flex items-center text-gray-600 dark:text-gray-300">
        <Building className="w-5 h-5 mr-2" />
        {company}
      </div>
    )}
    {location && (
      <div className="flex items-center text-gray-600 dark:text-gray-300">
        <MapPin className="w-5 h-5 mr-2" />
        {location}
      </div>
    )}
    {blog && (
      <div className="flex items-center text-blue-600 dark:text-blue-400">
        <LinkIcon className="w-5 h-5 mr-2" />
        <a href={formatUrl(blog)} target="_blank" rel="noopener noreferrer">
          {blog}
        </a>
      </div>
    )}
    {twitter_username && (
      <div className="flex items-center text-blue-400">
        <X className="w-5 h-5 mr-2" />
        <a href={`https://twitter.com/${twitter_username}`} target="_blank" rel="noopener noreferrer">
          @{twitter_username}
        </a>
      </div>
    )}
    <div className="flex items-center text-gray-600 dark:text-gray-300">
      <Calendar className="w-5 h-5 mr-2" />
      Joined {new Date(created_at).toLocaleDateString()}
    </div>
  </div>
);

export default ProfileInfoItems;
