import { useNotifications } from '../../hooks/useNotifications';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link, useLocation } from 'react-router-dom';
import LoadingSpinner from '../../components/LoadingSpinner';
import type { AppNotification } from '../../types/notification';

export const NotificationsPage = () => {
  const { data, isLoading, markAsRead, markAllAsRead, isMarkingAllAsRead, isMarkingAsRead } = useNotifications(100);
  const location = useLocation();

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
            <Bell className="w-6 h-6 text-blue-400" />
            Notifications
          </h1>
          <p className="text-gray-400">
            You have {unreadCount} unread notification{unreadCount !== 1 && 's'}.
          </p>
        </div>
        
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead()}
            disabled={isMarkingAllAsRead}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all font-medium text-sm disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all as read
          </button>
        )}
      </div>

      <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden">
        {notifications.length > 0 ? (
          <div className="divide-y divide-white/[0.05]">
            {notifications.map((notification: AppNotification) => (
              <div
                key={notification.id}
                className={`p-6 flex items-start gap-4 transition-colors ${
                  !notification.is_read ? 'bg-blue-500/[0.02]' : 'hover:bg-white/[0.01]'
                }`}
              >
                <div className={`p-2 rounded-xl mt-1 shrink-0 ${!notification.is_read ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-500'}`}>
                  <Bell className="w-5 h-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <h3 className={`text-base ${!notification.is_read ? 'text-white font-medium' : 'text-gray-300'}`}>
                      {notification.title}
                    </h3>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  
                  {notification.message && (
                    <p className="text-sm text-gray-400 mb-3">{notification.message}</p>
                  )}
                  
                  {notification.link && notification.link !== location.pathname && (
                    <Link
                      to={notification.link}
                      className="inline-flex text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
                    >
                      View details &rarr;
                    </Link>
                  )}
                </div>

                {!notification.is_read && (
                  <button
                    onClick={() => markAsRead(notification.id)}
                    disabled={isMarkingAsRead}
                    className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all shrink-0 ml-4 disabled:opacity-50"
                    title="Mark as read"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">You're all caught up!</h3>
            <p className="text-gray-400 text-sm">You don't have any notifications at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};
