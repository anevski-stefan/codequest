import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import useAuth from '../hooks/useAuth';
import {
  LayoutDashboard, GitPullRequest, Sparkles, Star, Compass,
  Trophy, Settings, LogOut, Zap, Menu, X, ChevronRight
} from 'lucide-react';
import type { RootState } from '../store';
import { useState, ReactNode } from 'react';
import FeedbackModal from './FeedbackModal';
import { NotificationsDropdown } from './ui/NotificationsDropdown';

interface LayoutProps {
  children?: ReactNode;
}

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  exact?: boolean;
  onClick?: () => void;
}

const NavItem = ({ to, icon: Icon, label, exact, onClick }: NavItemProps) => {
  const location = useLocation();
  const isActive = exact ? location.pathname === to : location.pathname.startsWith(to);
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
        isActive
          ? 'bg-white/[0.08] text-white'
          : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]'
      }`}
    >
      <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-blue-400' : 'group-hover:text-gray-300'}`} />
      <span className="truncate">{label}</span>
      {isActive && <ChevronRight className="w-3 h-3 ml-auto text-gray-600 shrink-0" />}
    </Link>
  );
};

const SidebarContent = ({ onClose, onFeedback }: { onClose?: () => void; onFeedback: () => void }) => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 flex items-center justify-between shrink-0">
        <button
          onClick={() => { navigate('/'); onClose?.(); }}
          className="flex items-center gap-2.5 group cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(99,102,241,0.3)]">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-white tracking-tight">Code Quest</span>
        </button>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-white/5 transition-all cursor-pointer lg:hidden">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {isAuthenticated ? (
          <>
            <div className="pb-1">
              <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" exact onClick={onClose} />
              <NavItem to="/assigned" icon={GitPullRequest} label="Assigned Issues" onClick={onClose} />
              <NavItem to="/suggested" icon={Sparkles} label="Suggested Issues" onClick={onClose} />
              <NavItem to="/starred" icon={Star} label="Starred" onClick={onClose} />
              <NavItem to="/explore" icon={Compass} label="Explore" onClick={onClose} />
              <NavItem to="/hackathons" icon={Trophy} label="Hackathons" onClick={onClose} />
            </div>
            <div className="pt-2 border-t border-white/[0.05]">
              <NavItem to="/settings" icon={Settings} label="Settings" onClick={onClose} />
            </div>
          </>
        ) : (
          <NavItem to="/hackathons" icon={Trophy} label="Hackathons" onClick={onClose} />
        )}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 pt-3 border-t border-white/[0.05] space-y-1 shrink-0">
        <button
          onClick={onFeedback}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-gray-600 hover:text-gray-300 hover:bg-white/[0.04] transition-all duration-150 cursor-pointer"
        >
          Send Feedback
        </button>

        {isAuthenticated ? (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 ring-1 ring-white/10">
              <img src={user?.avatar_url} alt={user?.login} className="w-full h-full object-cover" />
            </div>
            <button
              onClick={() => { navigate('/profile'); onClose?.(); }}
              className="flex-1 min-w-0 text-left cursor-pointer"
            >
              <p className="text-sm font-medium text-gray-300 hover:text-white transition-colors truncate">{user?.login}</p>
            </button>
            <button
              onClick={() => { logout(); onClose?.(); }}
              className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all cursor-pointer shrink-0"
              aria-label="Log out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            onClick={onClose}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 transition-all duration-150"
          >
            Sign in with GitHub
          </Link>
        )}
      </div>
    </div>
  );
};

const Layout = ({ children }: LayoutProps) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const { user } = useSelector((state: RootState) => state.auth);

  return (
    <div className="h-screen flex overflow-hidden bg-[#0B1222]">

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-56 lg:z-40 border-r border-white/[0.05]" style={{ background: '#080D18' }}>
        <SidebarContent onFeedback={() => setIsFeedbackOpen(true)} />
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 h-14 z-40 flex items-center justify-between px-4 border-b border-white/[0.05]" style={{ background: '#080D18' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-white">Code Quest</span>
          </div>
        </div>
        {user && (
          <div className="flex items-center gap-3">
            <NotificationsDropdown />
            <div className="w-7 h-7 rounded-full overflow-hidden ring-1 ring-white/10">
              <img src={user.avatar_url} alt={user.login} className="w-full h-full object-cover" />
            </div>
          </div>
        )}
      </header>

      {/* Mobile drawer overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-56 border-r border-white/[0.05]" style={{ background: '#080D18' }}>
            <SidebarContent onClose={() => setIsMobileOpen(false)} onFeedback={() => { setIsMobileOpen(false); setIsFeedbackOpen(true); }} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-56 flex-1 flex flex-col min-w-0 min-h-0">
        {/* Desktop Header */}
        <header className="hidden lg:flex h-14 items-center justify-end px-6 border-b border-white/[0.05]" style={{ background: '#0B1222' }}>
          <NotificationsDropdown />
        </header>

        <main className="flex-1 flex flex-col w-full h-[calc(100vh-3.5rem)] lg:pt-0 pt-14">
          {children || <Outlet />}
        </main>
      </div>

      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </div>
  );
};

export default Layout;
