import { Fragment } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { Link, useLocation } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';

export const NotificationsDropdown = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { data, isLoading, markAsRead, markAllAsRead } = useNotifications(5);
  const location = useLocation();

  if (!isAuthenticated) return null;

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  return (
    <Popover className="relative">
      {({ close }) => (
        <>
          <Popover.Button aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'} className="relative w-10 h-10 lg:w-9 lg:h-9 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-all duration-200 active:scale-95">
            <Bell className="w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-blue-400 opacity-60 animate-ping" />
                <span className="relative h-2 w-2 rounded-full bg-blue-400 ring-2 ring-base" />
              </span>
            )}
          </Popover.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1 scale-95"
            enterTo="opacity-100 translate-y-0 scale-100"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0 scale-100"
            leaveTo="opacity-0 translate-y-1 scale-95"
          >
            <Popover.Panel className="fixed right-2 top-14 sm:absolute sm:right-0 sm:top-auto sm:mt-2 z-50 w-[calc(100vw-1rem)] max-w-sm lg:max-w-md rounded-2xl bg-[#2E3245] border border-white/[0.08] shadow-[0_24px_48px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between p-4 border-b border-white/[0.07] bg-white/[0.03]">
                <h3 className="text-sm font-semibold text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead()}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="overflow-y-auto flex-1 min-h-[150px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="w-5 h-5 border-2 border-white/10 border-t-blue-400 rounded-full animate-spin" />
                  </div>
                ) : notifications.length > 0 ? (
                  <div className="flex flex-col divide-y divide-white/5">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 flex flex-col gap-1 transition-colors ${
                          !notification.is_read ? 'bg-blue-500/5' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${!notification.is_read ? 'text-white font-medium' : 'text-gray-300'}`}>
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-gray-500 hover:text-blue-400 p-1 rounded-md transition-colors shrink-0"
                              title="Mark as read"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {notification.message && (
                          <p className="text-xs text-gray-400 line-clamp-2">{notification.message}</p>
                        )}
                        {notification.link && notification.link !== location.pathname && (
                          <Link
                            to={notification.link}
                            onClick={() => close()}
                            className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors mt-0.5 inline-flex"
                          >
                            View details &rarr;
                          </Link>
                        )}
                        <span className="text-[10px] text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-500 space-y-2">
                    <Bell className="w-8 h-8 opacity-20" />
                    <p className="text-sm">No notifications</p>
                  </div>
                )}
              </div>

              <div className="p-2 border-t border-white/[0.07] bg-white/[0.02]">
                <Link
                  to="/notifications"
                  onClick={() => close()}
                  className="block w-full text-center px-4 py-2 text-xs font-medium text-blue-400 hover:text-blue-300 hover:bg-white/5 rounded-lg transition-all"
                >
                  View all notifications
                </Link>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
};
