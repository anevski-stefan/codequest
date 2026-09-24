import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Sparkles, GitPullRequest, Star, Zap, Trophy, BookOpen, ArrowRight, Send } from 'lucide-react';
import type { AxiosError } from 'axios';
import type { RootState } from '../../store';
import { usePageTitle } from '../../hooks/usePageTitle';
import FeedbackModal from '../../components/FeedbackModal';
import { API_BASE_URL, api } from '../../services/github';

const AUTH_REDIRECT_KEY = 'auth_redirect';

const FEATURES = [
  { icon: Sparkles, label: 'AI Issue Explainer', desc: 'Understand any GitHub issue in seconds' },
  { icon: BookOpen, label: 'Repo Onboarding', desc: 'Get up to speed on any codebase in 2 min' },
  { icon: Trophy, label: 'Open Source Opportunities', desc: 'Curated beginner-friendly issues daily' },
  { icon: GitPullRequest, label: 'PR Insights', desc: 'See what kinds of PRs get merged' },
];

const STATS = [
  { value: '30+', label: 'Famous orgs' },
  { value: 'AI', label: 'Powered guides' },
  { value: '∞', label: 'Issues to tackle' },
];

const Login = () => {
  usePageTitle('Login');
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [newsletterMsg, setNewsletterMsg] = useState('');

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    try {
      setNewsletterStatus('loading');
      const res = await api.post('/api/newsletter/subscribe', { email });
      setNewsletterStatus('success');
      setNewsletterMsg(res.data.message);
      setEmail('');
    } catch (err) {
      const axErr = err as AxiosError<{ error?: string }>;
      setNewsletterStatus('error');
      setNewsletterMsg(axErr.response?.data?.error || 'Something went wrong. Please try again.');
    }
  };

  const authError = (location.state as { authError?: string })?.authError;

  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as { from?: Location })?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleGitHubLogin = () => {
    const from = (location.state as { from?: Location })?.from?.pathname;
    if (from && from.startsWith('/') && !from.startsWith('//')) {
      sessionStorage.setItem(AUTH_REDIRECT_KEY, from);
    } else {
      sessionStorage.removeItem(AUTH_REDIRECT_KEY);
    }
    window.location.href = `${API_BASE_URL}/auth/github`;
  };

  return (
    <div className="fixed inset-0 bg-[#060C18] overflow-hidden">

      {/* Background glow orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute top-1/2 -right-60 w-[500px] h-[500px] rounded-full bg-violet-600/8 blur-[120px]" />
        <div className="absolute -bottom-40 left-1/3 w-[400px] h-[400px] rounded-full bg-indigo-500/8 blur-[100px]" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Nav */}
      <nav className="absolute top-0 w-full z-50 px-6 sm:px-10 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold text-white tracking-tight">Code Quest</span>
          </div>
          <button
            onClick={() => setIsFeedbackOpen(true)}
            className="text-sm font-medium text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer"
          >
            Send Feedback
          </button>
        </div>
      </nav>

      {/* Main content */}
      <div className="absolute inset-0 flex items-center justify-center px-4 sm:px-6 pt-20">
        <div className="w-full max-w-6xl mx-auto grid md:grid-cols-2 gap-8 md:gap-12 lg:gap-20 items-center">

          {/* Left — Hero */}
          <div className="flex flex-col gap-8">
            {/* Pill badges */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                AI-Powered
              </span>
              <a href="/hackathons" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium hover:bg-violet-500/15 transition-colors cursor-pointer">
                Hackathon Database
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>

            {/* Heading */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.08] tracking-tight">
                Build your CV with{' '}
                <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">
                  open source
                </span>
              </h1>
              <p className="text-lg text-gray-400 leading-relaxed max-w-md">
                Find beginner-friendly issues, understand any codebase with AI, and make contributions that matter.
              </p>
            </div>

            {/* Auth error */}
            {authError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
                <p className="font-medium">GitHub sign-in failed</p>
                {authError !== 'true' && <p className="mt-1 opacity-80">{authError}</p>}
              </div>
            )}

            {/* CTA */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleGitHubLogin}
                className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-white text-gray-900 font-semibold text-base hover:bg-gray-100 transition-all duration-200 shadow-[0_0_0_1px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.08)] cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                Continue with GitHub
                <ArrowRight className="w-4 h-4 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
              </button>
              <p className="text-xs text-gray-500 pl-1">Free forever · No credit card required</p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8 pt-2 border-t border-white/5">
              {STATS.map(s => (
                <div key={s.label}>
                  <div className="text-xl font-bold text-white">{s.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Feature card + newsletter */}
          <div className="flex flex-col gap-4">
            {/* Features — gradient border wrapper */}
            <div className="p-px rounded-2xl bg-gradient-to-b from-white/[0.12] via-white/[0.05] to-white/[0.02]">
              <div className="bg-[#0A1020] rounded-2xl p-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-5">What you get</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {FEATURES.map(({ icon: Icon, label, desc }) => (
                    <div
                      key={label}
                      className="group flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-200 cursor-default"
                    >
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/25 to-violet-600/25 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(99,102,241,0.15)]">
                        <Icon className="w-4 h-4 text-blue-300" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white/90 leading-tight">{label}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Newsletter — gradient border wrapper */}
            <div className="p-px rounded-2xl bg-gradient-to-b from-white/[0.10] via-white/[0.04] to-white/[0.01]">
              <div className="bg-[#0A1020] rounded-2xl p-6">
              <div className="flex items-start gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/25 to-orange-600/25 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                  <Star className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white/90">Stay in the loop</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Weekly updates on new features and opportunities</p>
                </div>
              </div>
              <form onSubmit={handleNewsletterSubmit} className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={newsletterStatus === 'loading' || newsletterStatus === 'success'}
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-white/20 focus:bg-white/[0.07] transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={newsletterStatus === 'loading' || newsletterStatus === 'success' || !email}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  {newsletterStatus === 'loading'
                    ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <Send className="w-4 h-4 text-white" />}
                </button>
              </form>
              {newsletterMsg && (
                <p className={`text-xs mt-2 ${newsletterStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {newsletterMsg}
                </p>
              )}
              <p className="text-xs text-gray-600 mt-4">
                By subscribing you agree to our{' '}
                <Link to="/privacy" className="text-gray-500 hover:text-gray-300 underline underline-offset-2 transition-colors" target="_blank" rel="noopener noreferrer">
                  privacy policy
                </Link>{' '}and{' '}
                <Link to="/terms" className="text-gray-500 hover:text-gray-300 underline underline-offset-2 transition-colors" target="_blank" rel="noopener noreferrer">
                  terms of service
                </Link>.
              </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </div>
  );
};

export default Login;
