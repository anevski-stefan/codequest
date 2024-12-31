import { useSelector } from 'react-redux';
import { Outlet } from 'react-router-dom';
import { Building, MapPin, Link as LinkIcon, Calendar, X } from 'lucide-react';
import type { RootState } from '../../store';
import type { GithubUser } from '../../types/github';
import { usePageTitle } from '../../hooks/usePageTitle';
import { motion } from 'framer-motion';

const Profile = () => {
  usePageTitle('Profile');
  const { user } = useSelector((state: RootState) => state.auth) as { user: GithubUser | null };

  if (!user) return null;

  return (
    <div className="flex flex-col md:flex-row flex-1 dark:bg-[#0B1222] mt-8">
      {/* Side Navigation - Desktop */}
      <div className="w-80 shrink-0 dark:bg-[#0B1222] border-r border-gray-200 dark:border-white/10">
        <div className="p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            <img
              src={user?.avatar_url}
              alt="Profile"
              className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-700 shadow-lg"
            />
            <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">{user?.name}</h2>
            <p className="text-gray-600 dark:text-gray-400">@{user?.login}</p>

            {user?.bio && (
              <p className="mt-4 text-center text-gray-600 dark:text-gray-300">
                {user.bio}
              </p>
            )}

            <div className="mt-6 flex items-center justify-center space-x-6 text-gray-600 dark:text-gray-300">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold">{user?.followers}</span>
                <span className="text-sm">Followers</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold">{user?.following}</span>
                <span className="text-sm">Following</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold">{user?.public_repos}</span>
                <span className="text-sm">Repos</span>
              </div>
            </div>

            <div className="mt-6 w-full space-y-3">
              {user?.company && (
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <Building className="w-5 h-5 mr-2" />
                  {user.company}
                </div>
              )}
              {user?.location && (
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <MapPin className="w-5 h-5 mr-2" />
                  {user.location}
                </div>
              )}
              {user?.blog && (
                <div className="flex items-center text-blue-600 dark:text-blue-400">
                  <LinkIcon className="w-5 h-5 mr-2" />
                  <a href={user.blog} target="_blank" rel="noopener noreferrer">
                    {user.blog}
                  </a>
                </div>
              )}
              {user?.twitter_username && (
                <div className="flex items-center text-blue-400">
                  <X className="w-5 h-5 mr-2" />
                  <a
                    href={`https://twitter.com/${user.twitter_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    @{user.twitter_username}
                  </a>
                </div>
              )}
              {user?.created_at && (
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <Calendar className="w-5 h-5 mr-2" />
                  Joined {new Date(user.created_at).toLocaleDateString()}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 p-4 md:p-6 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default Profile; 