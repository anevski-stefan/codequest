import { useMemo, type ReactNode, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  GitPullRequest, Bell, Star, Sparkles, ArrowRight, Check, Trophy, Compass,
  KeyRound, CalendarDays, MapPin, type LucideIcon,
} from 'lucide-react';
import type { RootState } from '../../store';
import type { Issue } from '../../types/github';
import { api, getAssignedIssues, getSuggestedIssues, getUserStarredCount } from '../../services/github';
import { fetchHackathons } from '../../services/hackathons';
import { useNotifications } from '../../hooks/useNotifications';
import { usePageTitle } from '../../hooks/usePageTitle';
import useIssueComments from '../../hooks/useIssueComments';
import IssueCard from '../../components/issues/IssueCard';
import IssueDetailsModal from '../../components/IssueDetailsModal';
import { Skeleton } from '../../components/ui/Skeleton';
import { CardSkeleton } from '../../components/skeletons';
import { formatRelativeDate } from '../../utils/formatDate';
import { easeOut } from '../../lib/motion';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

const todayLabel = () =>
  new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

const daysLeft = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
const daysLeftLabel = (d: string) => {
  const n = daysLeft(d);
  return n <= 0 ? 'Ends today' : n === 1 ? 'Ends tomorrow' : `${n} days left`;
};

/* ── Building blocks ─────────────────────────────────────────────── */

const Section = ({ title, to, cta = 'View all', children, delay = 0 }: { title: string; to?: string; cta?: string; children: ReactNode; delay?: number }) => (
  <motion.section
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, ease: easeOut, delay }}
  >
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[13px] font-semibold text-gray-200">{title}</h2>
      {to && (
        <Link to={to} className="group flex items-center gap-1 text-[12px] font-semibold text-gray-500 hover:text-blue-300 transition-colors">
          {cta}
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
    {children}
  </motion.section>
);

interface StatProps {
  to: string;
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint: string;
  loading: boolean;
  accent?: boolean;
  index: number;
}

const Stat = ({ to, icon: Icon, label, value, hint, loading, accent, index }: StatProps) => (
  <Link
    to={to}
    style={{ '--i': index } as CSSProperties}
    className="reveal group relative flex flex-col justify-between gap-5 rounded-xl border border-white/[0.07] bg-[#2E3245] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-white/[0.14] hover:bg-[#31364C] transition-colors"
  >
    <div className="flex items-center justify-between">
      <span className="text-[12px] font-medium text-gray-400">{label}</span>
      <Icon className={`w-4 h-4 ${accent ? 'text-blue-400' : 'text-gray-600 group-hover:text-gray-400'} transition-colors`} />
    </div>
    <div>
      {loading ? <Skeleton className="h-7 w-12" /> : (
        <p className="text-[26px] leading-none font-bold tracking-tight text-white tabular">{value}</p>
      )}
      <p className="mt-2 text-[11px] text-gray-500">{hint}</p>
    </div>
  </Link>
);

interface Step { done: boolean; title: string; to: string; cta: string }

const SetupChecklist = ({ steps }: { steps: Step[] }) => {
  const done = steps.filter(s => s.done).length;
  if (done === steps.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: easeOut, delay: 0.1 }}
      className="relative rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/[0.08] via-[#2E3245] to-[#2E3245] p-5 overflow-hidden"
    >
      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
        <div className="md:w-56 shrink-0">
          <p className="text-sm font-semibold text-white">Your path to a first PR</p>
          <p className="text-[12px] text-gray-400 mt-1"><span className="tabular">{done}</span> of {steps.length} done</p>
          <div className="mt-3 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-blue-400 origin-left"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: done / steps.length }}
              transition={{ duration: 0.9, ease: easeOut, delay: 0.3 }}
            />
          </div>
        </div>
        <ol className="flex-1 grid sm:grid-cols-3 gap-2">
          {steps.map((s, i) => (
            <li key={s.title}>
              <Link
                to={s.to}
                className={`group flex h-full items-start gap-3 rounded-xl border p-3 transition-colors ${
                  s.done ? 'border-white/[0.05] bg-white/[0.02]' : 'border-white/[0.08] bg-[#252836]/60 hover:border-blue-500/30 hover:bg-[#252836]'
                }`}
              >
                <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border text-[10px] font-bold ${
                  s.done ? 'bg-green-500/15 border-green-500/40 text-green-400' : 'border-white/15 text-gray-400'
                }`}>
                  {s.done ? <Check className="w-3 h-3" /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className={`block text-[13px] font-semibold ${s.done ? 'text-gray-500 line-through decoration-gray-600' : 'text-gray-100'}`}>{s.title}</span>
                  {!s.done && (
                    <span className="block text-[11px] text-gray-500 mt-0.5 group-hover:text-blue-300 transition-colors">{s.cta} →</span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </motion.div>
  );
};

/* ── Page ─────────────────────────────────────────────────────────── */

const Dashboard = () => {
  usePageTitle('Overview');
  const { user } = useSelector((s: RootState) => s.auth);
  const firstName = (user?.name ?? user?.login ?? '').split(' ')[0];

  const {
    isCommentsModalOpen, selectedIssue, allComments, isLoadingComments, hasMoreComments,
    isLoadingMore, onLoadMore, prefetchComments, handleViewComments, handleCloseComments, handleAddComment,
  } = useIssueComments();

  const assigned = useQuery({
    queryKey: ['assignedIssues', 'open'],
    queryFn: () => getAssignedIssues('open'),
    staleTime: 5 * 60 * 1000,
    select: (d): { issues: Issue[] } => ({ issues: Array.isArray(d) ? d : d.issues || [] }),
  });
  const suggested = useQuery({
    queryKey: ['overview-suggested'],
    queryFn: () => getSuggestedIssues({ timeFrame: 'month' }),
    staleTime: 10 * 60 * 1000,
  });
  const starred = useQuery({ queryKey: ['user-starred'], queryFn: () => getUserStarredCount(), staleTime: 10 * 60 * 1000 });
  const aiKeys = useQuery({
    queryKey: ['ai-keys'],
    queryFn: () => api.get<{ chatgpt: boolean; gemini: boolean }>('/api/ai-keys').then(r => r.data),
    staleTime: 10 * 60 * 1000,
  });
  const hackathons = useQuery({
    queryKey: ['overview-hackathons'],
    queryFn: () => fetchHackathons(1, 20, '', 'upcoming'),
    staleTime: 30 * 60 * 1000,
  });
  const notifications = useNotifications(5);

  const assignedIssues = assigned.data?.issues ?? [];

  // One issue per repository so the picks don't collapse into a single project.
  const picks = useMemo(() => {
    const seen = new Set<string>();
    const all = suggested.data?.issues ?? [];
    const unique = all.filter(i => !seen.has(i.repository.fullName) && seen.add(i.repository.fullName));
    return (unique.length >= 4 ? unique : all).slice(0, 6);
  }, [suggested.data]);

  // Scraped start dates are unreliable (sometimes land after the end date),
  // so rank by deadline: still open, closing soonest first.
  const upcoming = useMemo(() => {
    const now = Date.now();
    return (hackathons.data?.hackathons ?? [])
      .filter(h => new Date(h.endDate).getTime() >= now)
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
      .slice(0, 4);
  }, [hackathons.data]);
  const unread = notifications.data?.unreadCount ?? 0;
  const aiReady = !!(aiKeys.data?.gemini || aiKeys.data?.chatgpt);

  const summary = assigned.isLoading
    ? 'Loading your workspace'
    : assignedIssues.length > 0
      ? `${assignedIssues.length} issue${assignedIssues.length === 1 ? '' : 's'} in progress${unread ? ` and ${unread} unread notification${unread === 1 ? '' : 's'}` : ''}.`
      : 'Nothing in progress yet. Here are a few issues that fit you.';

  const steps: Step[] = [
    { done: aiReady, title: 'Connect an AI key', to: '/settings', cta: 'Open settings' },
    { done: (starred.data ?? 0) > 0, title: 'Star a repo to watch', to: '/explore', cta: 'Explore repos' },
    { done: assignedIssues.length > 0, title: 'Get assigned an issue', to: '/suggested', cta: 'Find one' },
  ];
  const checklistReady = !aiKeys.isLoading && !starred.isLoading && !assigned.isLoading;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1400px] px-6 lg:px-8 pt-7 pb-12 space-y-8">

        {/* Greeting */}
        <motion.header
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: easeOut }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-400/80 mb-1.5">{todayLabel()}</p>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {greeting()}{firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{summary}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/issues" className="flex items-center gap-2 h-9 px-3.5 rounded-lg border border-white/[0.09] bg-[#2E3245] text-[13px] font-semibold text-gray-300 hover:text-white hover:border-white/[0.18] active:scale-[0.97] transition-all">
              <Compass className="w-3.5 h-3.5" />
              Browse issues
            </Link>
            <Link to="/suggested" className="flex items-center gap-2 h-9 px-3.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-[13px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] active:scale-[0.97] transition-all">
              <Sparkles className="w-3.5 h-3.5" />
              Find an issue for me
            </Link>
          </div>
        </motion.header>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <Stat index={0} to="/assigned" icon={GitPullRequest} label="In progress" value={assignedIssues.length} hint="Open issues assigned to you" loading={assigned.isLoading} accent={assignedIssues.length > 0} />
          <Stat index={1} to="/notifications" icon={Bell} label="Unread" value={unread} hint="Notifications waiting" loading={notifications.isLoading} accent={unread > 0} />
          <Stat index={2} to="/starred" icon={Star} label="Watching" value={starred.data ?? 0} hint="Starred repositories" loading={starred.isLoading} />
          <Stat
            index={3} to="/settings" icon={KeyRound} label="AI assistant"
            value={<span className={aiReady ? 'text-white' : 'text-amber-300'}>{aiReady ? 'Ready' : 'Off'}</span>}
            hint={aiReady ? 'Issue explanations enabled' : 'Add a key to explain issues'}
            loading={aiKeys.isLoading} accent={aiReady}
          />
        </div>

        {checklistReady && <SetupChecklist steps={steps} />}

        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-8">
          {/* Main column */}
          <div className="space-y-8 min-w-0">
            {assignedIssues.length > 0 && (
              <Section title="In progress" to="/assigned" delay={0.05}>
                <div className="grid md:grid-cols-2 gap-2.5">
                  {assignedIssues.slice(0, 2).map((issue, i) => (
                    <IssueCard key={issue.id} issue={issue} index={i} dateField="updatedAt" onOpen={handleViewComments} onPrefetch={prefetchComments} />
                  ))}
                </div>
              </Section>
            )}

            <Section title="Picked for you" to="/suggested" cta="More suggestions" delay={0.1}>
              {suggested.isLoading ? (
                <div className="grid md:grid-cols-2 gap-2.5">{[0, 1, 2, 3].map(i => <CardSkeleton key={i} />)}</div>
              ) : picks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/[0.08] p-6 text-center text-[13px] text-gray-500">
                  No suggestions right now. <Link to="/issues" className="text-blue-300 hover:text-blue-200 font-semibold">Browse all issues</Link>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-2.5">
                  {picks.map((issue, i) => (
                    <IssueCard key={`${issue.repository.fullName}-${issue.number}`} issue={issue} index={i} onOpen={handleViewComments} onPrefetch={prefetchComments} />
                  ))}
                </div>
              )}
            </Section>
          </div>

          {/* Side column */}
          <aside className="space-y-8 min-w-0">
            <Section title="Hackathons closing soon" to="/hackathons" delay={0.15}>
              <div className="rounded-xl border border-white/[0.07] bg-[#2E3245] divide-y divide-white/[0.05] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                {hackathons.isLoading ? (
                  [0, 1, 2].map(i => (
                    <div key={i} className="p-3.5 space-y-2"><Skeleton className="h-3.5 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                  ))
                ) : upcoming.length === 0 ? (
                  <p className="p-4 text-[13px] text-gray-500">No upcoming events listed right now.</p>
                ) : upcoming.map(h => (
                  <a
                    key={h.url}
                    href={h.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-3 p-3.5 hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="w-10 shrink-0 rounded-lg border border-white/[0.08] bg-[#252836] text-center py-1">
                      <p className="text-[9px] font-semibold uppercase text-blue-300 leading-tight">
                        {new Date(h.endDate).toLocaleDateString(undefined, { month: 'short' })}
                      </p>
                      <p className="text-[15px] font-bold text-white leading-tight tabular">{new Date(h.endDate).getDate() || '–'}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-gray-200 group-hover:text-white truncate transition-colors">{h.title}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500 truncate">
                        <CalendarDays className="w-3 h-3 shrink-0" />
                        <span className={daysLeft(h.endDate) <= 7 ? 'text-amber-300/90' : ''}>{daysLeftLabel(h.endDate)}</span>
                        {h.location && <><span className="text-gray-600">·</span><MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{h.location}</span></>}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </Section>

            <Section title="Notifications" to="/notifications" delay={0.2}>
              <div className="rounded-xl border border-white/[0.07] bg-[#2E3245] divide-y divide-white/[0.05] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                {notifications.isLoading ? (
                  [0, 1].map(i => <div key={i} className="p-3.5 space-y-2"><Skeleton className="h-3.5 w-2/3" /><Skeleton className="h-3 w-1/3" /></div>)
                ) : (notifications.data?.notifications.length ?? 0) === 0 ? (
                  <div className="flex items-center gap-3 p-4">
                    <Check className="w-4 h-4 text-green-400" />
                    <p className="text-[13px] text-gray-400">You're all caught up.</p>
                  </div>
                ) : notifications.data!.notifications.slice(0, 3).map(n => (
                  <Link key={n.id} to={n.link || '/notifications'} className="flex items-start gap-3 p-3.5 hover:bg-white/[0.03] transition-colors">
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${n.is_read ? 'bg-white/10' : 'bg-blue-400'}`} />
                    <div className="min-w-0">
                      <p className={`text-[13px] truncate ${n.is_read ? 'text-gray-400' : 'text-gray-100 font-semibold'}`}>{n.title}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{formatRelativeDate(n.created_at)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>

            <Section title="Discover" delay={0.25}>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { to: '/explore', icon: Compass, label: 'Explore repos' },
                  { to: '/hackathons', icon: Trophy, label: 'Hackathons' },
                ].map(l => (
                  <Link key={l.to} to={l.to} className="flex items-center gap-2.5 h-11 px-3 rounded-xl border border-white/[0.07] bg-[#2E3245] text-[13px] font-semibold text-gray-300 hover:text-white hover:border-white/[0.14] transition-colors">
                    <l.icon className="w-4 h-4 text-gray-500" />{l.label}
                  </Link>
                ))}
              </div>
            </Section>
          </aside>
        </div>
      </div>

      <IssueDetailsModal
        isOpen={isCommentsModalOpen}
        onClose={handleCloseComments}
        issue={selectedIssue}
        comments={allComments}
        isLoadingComments={isLoadingComments}
        hasMoreComments={hasMoreComments}
        isLoadingMore={isLoadingMore}
        onLoadMore={onLoadMore}
        onAddComment={handleAddComment}
      />
    </div>
  );
};

export default Dashboard;
