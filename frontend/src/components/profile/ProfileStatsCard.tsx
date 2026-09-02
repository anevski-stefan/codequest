import { motion } from 'framer-motion';

interface ProfileStatsCardProps {
  starredCount?: number;
  publicGists?: number;
  hireable?: boolean | null;
}

const ProfileStatsCard = ({ starredCount = 0, publicGists = 0, hireable }: ProfileStatsCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="mt-6 bg-white dark:bg-[#0B1222] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-white/10"
  >
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
      Statistics
    </h3>
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-gray-600 dark:text-gray-300">Starred Repos</span>
        <span className="font-semibold text-gray-900 dark:text-white">
          {starredCount}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-600 dark:text-gray-300">Public Gists</span>
        <span className="font-semibold text-gray-900 dark:text-white">
          {publicGists}
        </span>
      </div>
      {hireable && (
        <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          Available for hire
        </div>
      )}
    </div>
  </motion.div>
);

export default ProfileStatsCard;
