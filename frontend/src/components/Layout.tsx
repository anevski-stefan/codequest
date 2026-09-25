import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import useAuth from '../hooks/useAuth';
import {
  LayoutDashboard, GitPullRequest, Sparkles, Star, Compass,
  Trophy, Settings, LogOut, Zap, Menu, X, Search, MessageSquareText, User, Bell,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { RootState } from '../store';
import { useState, useEffect, useMemo, type ReactNode } from 'react';
import FeedbackModal from './FeedbackModal';
import CommandPalette, { type CommandItem } from './CommandPalette';
import { NotificationsDropdown } from './ui/NotificationsDropdown';
import { easeOut } from '../lib/motion';

interface LayoutProps {
  children?: ReactNode;
}

interface NavEntry {
  to: string;
  icon: React.ElementType;
  label: string;
  exact?: boolean;
}

const WORKSPACE: NavEntry[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/assigned', icon: GitPullRequest, label: 'Assigned Issues' },
  { to: '/suggested', icon: Sparkles, label: 'Suggested Issues' },
  { to: '/starred', icon: Star, label: 'Starred' },
];

const DISCOVER: NavEntry[] = [
  { to: '/explore', icon: Compass, label: 'Explore' },
  { to: '/hackathons', icon: Trophy, label: 'Hackathons' },
];

const ROUTE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  assigned: 'Assigned Issues',
  suggested: 'Suggested Issues',
  starred: 'Starred',
  explore: 'Explore',
  hackathons: 'Hackathons',
  settings: 'Settings',
  profile: 'Profile',
  notifications: 'Notifications',
  contributors: 'Contributors',
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
};

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

const NavItem = ({ to, icon: Icon, label, exact, onClick, layoutGroup }: NavEntry & { onClick?: () => void; layoutGroup: string }) => {
  const location = useLocation();
  const isActive = exact ? location.pathname === to : location.pathname.startsWith(to);
  return (
    <Link
      to={to}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={`relative flex items-center gap-3 px-3 h-9 rounded-lg text-[13px] font-semibold transition-colors duration-200 group ${
        isActive ? 'text-white' : 'text-white/45 hover:text-white/80'
      }`}
    >
      {isActive && (
        <motion.span
          layoutId={`nav-active-${layoutGroup}`}
          className="absolute inset-0 rounded-lg bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        >
          <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-[3px] h-4 rounded-r-full bg-blue-400" />
        </motion.span>
      )}
      {!isActive && <span className="absolute inset-0 rounded-lg bg-white/[0.04] opacity-0 group-hover:opacity-100 transition-opacity" />}
      <Icon className={`relative w-4 h-4 shrink-0 transition-colors duration-200 ${isActive ? 'text-blue-400' : 'group-hover:text-white/70'}`} />
      <span className="relative truncate">{label}</span>
    </Link>
  );
};

const NavSection = ({ title, entries, onClose, layoutGroup }: { title: string; entries: NavEntry[]; onClose?: () => void; layoutGroup: string }) => (
  <div>
    <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/25">{title}</p>
    <div className="space-y-0.5">
      {entries.map(e => <NavItem key={e.to} {...e} onClick={onClose} layoutGroup={layoutGroup} />)}
    </div>
  </div>
);

const SearchTrigger = ({ onClick, className = '' }: { onClick: () => void; className?: string }) => (
  <button
    onClick={onClick}
    className={`group flex items-center gap-2.5 h-9 pl-3 pr-2 rounded-lg border border-white/[0.07] bg-white/[0.03] text-[13px] text-white/40 hover:text-white/70 hover:border-white/[0.12] hover:bg-white/[0.05] transition-all cursor-pointer ${className}`}
    aria-label="Open command menu"
  >
    <Search className="w-3.5 h-3.5 shrink-0" />
    <span className="flex-1 text-left truncate">Search</span>
    <span className="flex items-center gap-0.5">
      <span className="kbd">{isMac ? '⌘' : 'Ctrl'}</span>
      <span className="kbd">K</span>
    </span>
  </button>
);

const SidebarContent = ({ onClose, onFeedback, onSearch, layoutGroup }: { onClose?: () => void; onFeedback: () => void; onSearch: () => void; layoutGroup: string }) => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 h-14 flex items-center justify-between shrink-0">
        <button
          onClick={() => { navigate('/'); onClose?.(); }}
          className="flex items-center gap-2.5 cursor-pointer rounded-lg"
        >
          <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_2px_8px_-2px_rgba(59,123,255,0.5)]">
            <Zap className="w-4 h-4 text-white" fill="currentColor" strokeWidth={1.5} />
          </div>
          <span className="text-sm font-bold text-white tracking-tight">Code Quest</span>
        </button>
        {onClose && (
          <button onClick={onClose} aria-label="Close menu" className="w-9 h-9 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all cursor-pointer active:scale-95">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isAuthenticated && (
        <div className="px-3 pb-3">
          <SearchTrigger onClick={() => { onClose?.(); onSearch(); }} className="w-full" />
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 pt-2 space-y-5 overflow-y-auto" aria-label="Primary">
        {isAuthenticated ? (
          <>
            <NavSection title="Workspace" entries={WORKSPACE} onClose={onClose} layoutGroup={layoutGroup} />
            <NavSection title="Discover" entries={DISCOVER} onClose={onClose} layoutGroup={layoutGroup} />
          </>
        ) : (
          <NavSection title="Discover" entries={[DISCOVER[1]]} onClose={onClose} layoutGroup={layoutGroup} />
        )}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 pt-3 space-y-0.5 shrink-0">
        {isAuthenticated && (
          <NavItem to="/settings" icon={Settings} label="Settings" onClick={onClose} layoutGroup={layoutGroup} />
        )}
        <button
          onClick={onFeedback}
          className="w-full flex items-center gap-3 px-3 h-9 rounded-lg text-[13px] font-semibold text-white/45 hover:text-white/80 hover:bg-white/[0.04] transition-all duration-200 cursor-pointer"
        >
          <MessageSquareText className="w-4 h-4" />
          Send Feedback
        </button>

        <div className="pt-3 mt-2 border-t border-white/[0.05]">
          {isAuthenticated ? (
            <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-white/[0.04] transition-colors duration-200">
              <button
                onClick={() => { navigate('/profile'); onClose?.(); }}
                className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer rounded-lg"
              >
                <div className="relative shrink-0">
                  <img src={user?.avatar_url} alt="" width={28} height={28} className="w-7 h-7 rounded-full object-cover ring-1 ring-white/10" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 ring-2 ring-[#1D2030]" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-white/85 truncate">{user?.login}</p>
                  <p className="text-[11px] text-white/35 truncate">View profile</p>
                </div>
              </button>
              <button
                onClick={() => { logout(); onClose?.(); }}
                className="w-8 h-8 flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all cursor-pointer shrink-0 active:scale-95"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              onClick={onClose}
              className="flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold text-gray-900 bg-white hover:bg-gray-100 active:scale-[0.98] transition-all duration-200"
            >
              Sign in with GitHub
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

const Breadcrumb = () => {
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);
  if (parts.length === 0) return null;
  const [root, ...rest] = parts;
  const rootTitle = ROUTE_TITLES[root] ?? root;
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] min-w-0">
      {rest.length > 0 && root !== 'contributors' ? (
        <Link to={`/${root}`} className="text-gray-500 hover:text-gray-300 transition-colors">{rootTitle}</Link>
      ) : (
        <span className="text-gray-200 font-semibold">{rootTitle}</span>
      )}
      {rest.length > 0 && (
        <>
          <span className="text-gray-600">/</span>
          <span className="text-gray-200 font-semibold truncate">{rest.join('/')}</span>
        </>
      )}
    </nav>
  );
};

const Layout = ({ children }: LayoutProps) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        if (!isAuthenticated) return;
        e.preventDefault();
        setIsPaletteOpen(o => !o);
      } else if (e.key === 'Escape') {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isAuthenticated]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  const commands = useMemo<CommandItem[]>(() => [
    ...[...WORKSPACE, ...DISCOVER].map(n => ({
      id: n.to, label: n.label, group: 'Navigate', icon: n.icon as CommandItem['icon'], run: () => navigate(n.to),
    })),
    { id: '/notifications', label: 'Notifications', group: 'Navigate', icon: Bell, run: () => navigate('/notifications') },
    { id: '/profile', label: 'Your profile', group: 'Navigate', icon: User, run: () => navigate('/profile') },
    { id: '/settings', label: 'Settings', group: 'Navigate', icon: Settings, keywords: 'api key ai provider', run: () => navigate('/settings') },
    { id: 'feedback', label: 'Send feedback', group: 'Actions', icon: MessageSquareText, run: () => setIsFeedbackOpen(true) },
    { id: 'logout', label: 'Log out', group: 'Actions', icon: LogOut, keywords: 'sign out', run: () => logout() },
  ], [navigate, logout]);

  return (
    <div className="h-[100dvh] flex overflow-hidden bg-base">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:px-3 focus:py-2 focus:rounded-lg focus:bg-blue-500 focus:text-white focus:text-sm focus:font-semibold"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-60 lg:z-40 bg-sidebar border-r border-white/[0.05]">
        <SidebarContent
          onFeedback={() => setIsFeedbackOpen(true)}
          onSearch={() => setIsPaletteOpen(true)}
          layoutGroup="desktop"
        />
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 h-14 z-40 flex items-center justify-between px-3 bg-sidebar/90 backdrop-blur-md border-b border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={isMobileOpen}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all cursor-pointer active:scale-95"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
              <Zap className="w-3.5 h-3.5 text-white" fill="currentColor" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">Code Quest</span>
          </div>
        </div>
        {user && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsPaletteOpen(true)}
              aria-label="Search"
              className="w-10 h-10 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              <Search className="w-[18px] h-[18px]" />
            </button>
            <NotificationsDropdown />
          </div>
        )}
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <motion.div
              className="absolute inset-0 bg-[#0f111a]/70 backdrop-blur-[2px]"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMobileOpen(false)}
            />
            <motion.aside
              className="absolute inset-y-0 left-0 w-[min(20rem,86vw)] bg-sidebar border-r border-white/[0.06] shadow-[24px_0_48px_-12px_rgba(0,0,0,0.5)]"
              initial={{ x: '-100%' }}
              animate={{ x: 0, transition: { type: 'spring', stiffness: 380, damping: 38 } }}
              exit={{ x: '-100%', transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
            >
              <SidebarContent
                onClose={() => setIsMobileOpen(false)}
                onFeedback={() => { setIsMobileOpen(false); setIsFeedbackOpen(true); }}
                onSearch={() => setIsPaletteOpen(true)}
                layoutGroup="mobile"
              />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="lg:pl-60 flex-1 flex flex-col min-w-0 min-h-0">
        <header className="hidden lg:flex h-14 shrink-0 items-center justify-between gap-4 px-6 lg:px-8 border-b border-white/[0.05]">
          <Breadcrumb />
          {user && <NotificationsDropdown />}
        </header>

        <main id="main" tabIndex={-1} className="flex-1 flex flex-col w-full min-h-0 pt-14 lg:pt-0 outline-none">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: easeOut }}
            className="flex-1 flex flex-col min-h-0 overflow-y-auto"
          >
            {children || <Outlet />}
          </motion.div>
        </main>
      </div>

      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
      {isAuthenticated && (
        <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} items={commands} />
      )}
    </div>
  );
};

export default Layout;
