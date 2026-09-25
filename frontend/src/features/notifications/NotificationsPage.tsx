import type { CSSProperties } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { Bell, Check, CheckCheck, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link, useLocation } from 'react-router-dom';
import type { AppNotification } from '../../types/notification';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { usePageTitle } from '../../hooks/usePageTitle';

export const NotificationsPage = () => {
  usePageTitle('Notifications');
  const { data, isLoading, markAsRead, markAllAsRead, isMarkingAllAsRead, isMarkingAsRead } = useNotifications(100);
  const location = useLocation();

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 lg:px-8 pt-7 shrink-0">
        <PageHeader
          eyebrow="Account"
          title="Notifications"
          subtitle={isLoading ? 'Loading' : unreadCount > 0 ? <span className="tabular">{unreadCount} unread</span> : 'All caught up'}
          actions={unreadCount > 0 ? (
            <button
              onClick={() => markAllAsRead()}
              disabled={isMarkingAllAsRead}
              className="flex items-center gap-2 h-8 px-3 rounded-lg border border-white/[0.09] bg-[#363B52] text-[11px] font-semibold text-gray-300 hover:text-white hover:border-white/[0.18] active:scale-[0.97] transition-all disabled:opacity-50 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          ) : undefined}
        />
        <div className="border-b border-white/[0.05]" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl px-4 lg:px-6 xl:px-8 py-4">
          {isLoading ? (
            <div className="space-y-2" role="status" aria-label="Loading notifications">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3.5 p-4 rounded-xl border border-white/[0.06] bg-[#2E3245]/60">
                  <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="You're all caught up"
              subtitle="Replies on issues you follow and updates to your assigned work will show up here."
            />
          ) : (
            <ul className="space-y-2">
              {notifications.map((n: AppNotification, i) => {
                const unread = !n.is_read;
                return (
                  <li
                    key={n.id}
                    style={{ '--i': i } as CSSProperties}
                    className={`reveal group relative flex items-start gap-3.5 p-4 rounded-xl border transition-colors ${
                      unread
                        ? 'border-blue-500/20 bg-blue-500/[0.04]'
                        : 'border-white/[0.06] bg-[#2E3245]/60 hover:bg-[#2E3245]'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      unread ? 'bg-blue-500/10 border-blue-500/25 text-blue-400' : 'bg-white/[0.03] border-white/[0.07] text-gray-500'
                    }`}>
                      <Bell className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className={`text-sm leading-snug ${unread ? 'text-white font-semibold' : 'text-gray-300 font-medium'}`}>
                          {unread && <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 mr-2 align-middle" aria-label="Unread" />}
                          {n.title}
                        </h3>
                        <time dateTime={n.created_at} className="text-[11px] text-gray-500 whitespace-nowrap pt-0.5">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </time>
                      </div>

                      {n.message && <p className="text-[13px] text-gray-400 mt-1 leading-relaxed">{n.message}</p>}

                      {n.link && n.link !== location.pathname && (
                        <Link
                          to={n.link}
                          onClick={() => unread && markAsRead(n.id)}
                          className="inline-flex items-center gap-1 mt-2.5 text-[13px] text-blue-400 hover:text-blue-300 font-semibold transition-colors group/link"
                        >
                          View details
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5" />
                        </Link>
                      )}
                    </div>

                    {unread && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        disabled={isMarkingAsRead}
                        className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all shrink-0 disabled:opacity-50 cursor-pointer"
                        aria-label="Mark as read"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
