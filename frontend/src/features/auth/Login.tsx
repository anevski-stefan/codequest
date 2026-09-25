import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Zap, ArrowRight, ArrowDown, Send, Check, AlertTriangle } from 'lucide-react';
import type { AxiosError } from 'axios';
import type { RootState } from '../../store';
import { usePageTitle } from '../../hooks/usePageTitle';
import FeedbackModal from '../../components/FeedbackModal';
import { API_BASE_URL, api } from '../../services/github';
import { easeOut, fadeUp, stagger } from '../../lib/motion';
import HeroPreview from './landing/HeroPreview';
import StorySteps from './landing/StorySteps';
import FeatureBento from './landing/FeatureBento';

const AUTH_REDIRECT_KEY = 'auth_redirect';

// Mirrors the org list the backend searches for suggested issues.
const ORGS = [
  'microsoft', 'vercel', 'rust-lang', 'kubernetes', 'vuejs', 'python', 'grafana', 'supabase',
  'sveltejs', 'golang', 'tailwindlabs', 'mozilla', 'huggingface', 'denoland', 'django', 'prisma',
];

const GitHubMark = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const GitHubButton = ({ onClick, label = 'Continue with GitHub', size = 'lg' }: { onClick: () => void; label?: string; size?: 'lg' | 'sm' }) => (
  <button
    onClick={onClick}
    className={`group inline-flex items-center justify-center gap-2.5 rounded-xl bg-white text-gray-900 font-bold hover:bg-gray-100 active:scale-[0.98] transition-all duration-200 shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_12px_32px_-12px_rgba(255,255,255,0.35)] cursor-pointer ${
      size === 'lg' ? 'h-12 px-6 text-[15px]' : 'h-9 px-4 text-[13px]'
    }`}
  >
    <GitHubMark className={size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />
    {label}
    <ArrowRight className={`${size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} transition-transform duration-200 group-hover:translate-x-0.5`} />
  </button>
);

const SectionIntro = ({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-10% 0px' }}
    transition={{ duration: 0.6, ease: easeOut }}
    className="max-w-2xl"
  >
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-400/90">{eyebrow}</p>
    <h2 className="mt-3 text-3xl md:text-[40px] font-extrabold tracking-tight text-white leading-[1.1]">{title}</h2>
    {body && <p className="mt-4 text-base text-gray-400 leading-relaxed max-w-[56ch]">{body}</p>}
  </motion.div>
);

const Login = () => {
  usePageTitle('Find your first open source contribution');
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [newsletterMsg, setNewsletterMsg] = useState('');
  const [scrolled, setScrolled] = useState(false);

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

  // Nav picks up a surface once the hero scrolls away.
  useEffect(() => {
    const el = document.getElementById('landing-top');
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

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
    <div className="grain relative min-h-[100dvh] w-full bg-base text-gray-100 overflow-x-clip">
      {/* Ambient light + grid, fixed so they don't repaint on scroll */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-[20%] left-[8%] w-[900px] h-[700px] rounded-full bg-blue-500/[0.07] blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(ellipse_70%_50%_at_30%_0%,black,transparent)]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
      </div>

      <span id="landing-top" className="absolute top-0 h-24 w-px" aria-hidden="true" />

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className={`sticky top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300 border-b ${
        scrolled ? 'bg-base/80 backdrop-blur-md border-white/[0.06]' : 'bg-transparent border-transparent'
      }`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-2.5 rounded-lg">
            <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_12px_-4px_rgba(59,123,255,0.6)]">
              <Zap className="w-4 h-4 text-white" fill="currentColor" strokeWidth={1.5} />
            </div>
            <span className="text-[15px] font-bold text-white tracking-tight">Code Quest</span>
          </a>
          <div className="flex items-center gap-1 sm:gap-2">
            <a href="#how" className="hidden md:inline-flex h-9 items-center px-3 rounded-lg text-[13px] font-medium text-gray-400 hover:text-white transition-colors">How it works</a>
            <a href="#features" className="hidden md:inline-flex h-9 items-center px-3 rounded-lg text-[13px] font-medium text-gray-400 hover:text-white transition-colors">Features</a>
            <Link to="/hackathons" className="hidden sm:inline-flex h-9 items-center px-3 rounded-lg text-[13px] font-medium text-gray-400 hover:text-white transition-colors">Hackathons</Link>
            <div className="w-px h-5 bg-white/[0.08] mx-1 hidden md:block" />
            <GitHubButton onClick={handleGitHubLogin} label="Sign in" size="sm" />
          </div>
        </div>
      </nav>

      <main id="top" className="relative">
        {/* ── Hero ───────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 md:pt-20 pb-20 md:pb-28 grid lg:grid-cols-[1.05fr_1fr] gap-14 lg:gap-12 items-center">
          <motion.div variants={stagger(0.08, 0.05)} initial="hidden" animate="show">
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 h-7 pl-2 pr-3 rounded-full border border-white/[0.08] bg-white/[0.03] text-[12px] font-medium text-gray-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inset-0 rounded-full bg-green-400 opacity-60 animate-ping" />
                  <span className="relative h-2 w-2 rounded-full bg-green-400" />
                </span>
                Open source, without the guesswork
              </span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="mt-6 text-[40px] leading-[1.04] sm:text-5xl lg:text-[64px] font-extrabold tracking-[-0.035em] text-white">
              Build your CV with{' '}
              <span className="relative whitespace-nowrap text-blue-400">
                open source
                <motion.svg
                  viewBox="0 0 300 12" preserveAspectRatio="none" aria-hidden="true"
                  className="absolute left-0 -bottom-1.5 w-full h-3 text-blue-400/60"
                >
                  <motion.path
                    d="M2 9 C 80 3, 200 3, 298 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                    transition={{ duration: 0.9, delay: 0.7, ease: easeOut }}
                  />
                </motion.svg>
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-6 text-lg text-gray-400 leading-relaxed max-w-[50ch]">
              Find beginner-friendly issues, understand the codebase with AI, and ship pull requests that maintainers actually merge.
            </motion.p>

            {authError && (
              <motion.div variants={fadeUp} role="alert" className="mt-6 flex items-start gap-3 max-w-md rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-red-300">GitHub sign-in failed</p>
                  <p className="text-gray-400 mt-0.5">{authError !== 'true' ? authError : 'Please try again.'}</p>
                </div>
              </motion.div>
            )}

            <motion.div variants={fadeUp} className="mt-9 flex flex-col sm:flex-row sm:items-center gap-3">
              <GitHubButton onClick={handleGitHubLogin} />
              <a href="#how" className="group inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl text-[15px] font-semibold text-gray-300 border border-white/[0.09] hover:border-white/[0.18] hover:text-white hover:bg-white/[0.03] transition-all">
                See how it works
                <ArrowDown className="w-4 h-4 text-gray-500 group-hover:text-gray-300 group-hover:translate-y-0.5 transition-all" />
              </a>
            </motion.div>

            <motion.ul variants={fadeUp} className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-gray-500">
              {['Free, no card', 'Public repos only', 'Bring your own AI key'].map(t => (
                <li key={t} className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-400/80" />{t}</li>
              ))}
            </motion.ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24, rotateX: 8 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.9, ease: easeOut, delay: 0.25 }}
            style={{ transformPerspective: 1200 }}
            className="lg:pl-4"
          >
            <HeroPreview />
          </motion.div>
        </section>

        {/* ── Org marquee ────────────────────────────────────── */}
        <section className="border-y border-white/[0.05] bg-sidebar/40 py-7" aria-label="Organizations covered">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-10">
            <p className="text-[12px] text-gray-500 shrink-0 md:w-44 leading-snug">
              Issues from <span className="text-gray-300 font-semibold">30+ organizations</span> you already know
            </p>
            <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
              <motion.div
                className="flex gap-10 w-max"
                animate={{ x: ['0%', '-50%'] }}
                transition={{ duration: 40, ease: 'linear', repeat: Infinity }}
              >
                {[...ORGS, ...ORGS].map((o, i) => (
                  <span key={i} className="font-mono text-[14px] text-gray-500 whitespace-nowrap">{o}</span>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Story ──────────────────────────────────────────── */}
        <section id="how" className="scroll-mt-20 max-w-6xl mx-auto px-4 sm:px-6 py-24 md:py-32">
          <SectionIntro
            eyebrow="How it works"
            title="From first look to merged PR"
            body="Most people quit their first contribution before writing a line of code: the issue is vague, the repo is huge, and nobody replies. Code Quest removes each of those walls in order."
          />
          <div className="mt-16 md:mt-20">
            <StorySteps />
          </div>
        </section>

        {/* ── Features ───────────────────────────────────────── */}
        <section id="features" className="scroll-mt-20 max-w-6xl mx-auto px-4 sm:px-6 pb-24 md:pb-32">
          <SectionIntro
            eyebrow="Features"
            title="Pick repos that will review your work"
            body="Stars don't tell you whether a maintainer will look at your pull request. These signals do."
          />
          <div className="mt-12">
            <FeatureBento />
          </div>
        </section>

        {/* ── Closing CTA ────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.7, ease: easeOut }}
            className="relative rounded-3xl border border-white/[0.08] bg-[#2A2E40] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          >
            <div className="absolute -top-40 -right-20 w-[520px] h-[420px] rounded-full bg-blue-500/[0.12] blur-[100px] pointer-events-none" aria-hidden="true" />
            <div className="relative grid md:grid-cols-[1.3fr_1fr] gap-10 p-8 md:p-12">
              <div>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-[1.1]">
                  Your first merged PR is closer than you think.
                </h2>
                <p className="mt-4 text-base text-gray-400 max-w-[46ch] leading-relaxed">
                  Sign in with GitHub and you'll have a shortlist of issues matched to your languages in under a minute.
                </p>
                <div className="mt-8">
                  <GitHubButton onClick={handleGitHubLogin} label="Get started free" />
                </div>
              </div>

              <div className="md:border-l md:border-white/[0.06] md:pl-10 flex flex-col justify-center">
                <label htmlFor="newsletter" className="text-sm font-semibold text-white">Not ready yet?</label>
                <p className="text-[13px] text-gray-500 mt-1">One email a week with fresh issues and upcoming hackathons.</p>
                <form onSubmit={handleNewsletterSubmit} className="mt-4 flex gap-2">
                  <input
                    id="newsletter"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@domain.dev"
                    required
                    disabled={newsletterStatus === 'loading' || newsletterStatus === 'success'}
                    aria-describedby="newsletter-msg"
                    className="flex-1 min-w-0 h-11 px-3.5 rounded-xl bg-white/[0.04] border border-white/[0.09] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500/50 focus:shadow-[0_0_0_3px_rgba(59,123,255,0.12)] transition-all disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={newsletterStatus === 'loading' || newsletterStatus === 'success' || !email}
                    aria-label="Subscribe"
                    className="h-11 w-11 flex items-center justify-center rounded-xl bg-white/[0.08] border border-white/[0.09] hover:bg-white/[0.14] disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    {newsletterStatus === 'loading'
                      ? <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      : newsletterStatus === 'success'
                        ? <Check className="w-4 h-4 text-green-400" />
                        : <Send className="w-4 h-4 text-white" />}
                  </button>
                </form>
                <p id="newsletter-msg" aria-live="polite" className={`text-xs mt-2 min-h-[16px] ${newsletterStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {newsletterMsg}
                </p>
                <p className="text-[11px] text-gray-600 mt-1">
                  By subscribing you agree to our{' '}
                  <Link to="/privacy" className="text-gray-500 hover:text-gray-300 underline underline-offset-2">privacy policy</Link>.
                </p>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="relative border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[13px] text-gray-500">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-blue-400" fill="currentColor" strokeWidth={1.5} />
            <span>Code Quest · {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className="hover:text-gray-300 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-gray-300 transition-colors">Terms</Link>
            <button onClick={() => setIsFeedbackOpen(true)} className="hover:text-gray-300 transition-colors cursor-pointer">Send feedback</button>
          </div>
        </div>
      </footer>

      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </div>
  );
};

export default Login;
