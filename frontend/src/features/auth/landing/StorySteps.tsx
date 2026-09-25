import { useRef, type ReactNode } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { Search, Sparkles, Map, GitPullRequest, Check } from 'lucide-react';
import { easeOut } from '../../../lib/motion';

interface Step {
  icon: typeof Search;
  kicker: string;
  title: string;
  body: string;
  visual: ReactNode;
}

const FindVisual = () => (
  <div className="space-y-1.5">
    {[
      { t: 'Add dark mode toggle to settings page', r: 'lumen-ui/lumen', l: 'good first issue' },
      { t: 'Typo in CONTRIBUTING install steps', r: 'orbitdb/cli', l: 'docs' },
      { t: 'Flaky test in retry backoff', r: 'kestrel-io/queue', l: 'help wanted' },
    ].map((row, i) => (
      <div key={row.t} className={`flex items-center gap-3 px-3 h-10 rounded-lg border ${i === 0 ? 'border-blue-500/30 bg-blue-500/[0.06]' : 'border-white/[0.05] bg-white/[0.02]'}`}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${i === 0 ? 'bg-blue-400' : 'bg-green-400/70'}`} />
        <span className="text-[12px] text-gray-200 truncate flex-1">{row.t}</span>
        <span className="hidden sm:inline text-[10px] text-gray-500 font-mono shrink-0">{row.r}</span>
      </div>
    ))}
  </div>
);

const ExplainVisual = () => (
  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5 space-y-2">
    <div className="flex items-center gap-2 text-[11px] text-blue-300"><Sparkles className="w-3 h-3" />Plain-English summary</div>
    <p className="text-[12px] text-gray-300 leading-relaxed">The toggle state is stored but never read on page load. Read it in <code className="text-blue-300 text-[11px]">useTheme()</code> and pass it to the provider.</p>
    <div className="flex gap-1.5 pt-1">
      <span className="px-1.5 py-px rounded text-[10px] border border-white/10 text-gray-400">~40 lines</span>
      <span className="px-1.5 py-px rounded text-[10px] border border-white/10 text-gray-400">React</span>
      <span className="px-1.5 py-px rounded text-[10px] border border-green-500/30 text-green-300">beginner</span>
    </div>
  </div>
);

const OnboardVisual = () => (
  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5 font-mono text-[11px] leading-6 text-gray-500">
    <div><span className="text-gray-400">src/</span></div>
    <div className="pl-4">components/ <span className="text-gray-600">— UI primitives</span></div>
    <div className="pl-4 text-gray-200">settings/ <span className="text-blue-300">← start here</span></div>
    <div className="pl-4">hooks/ <span className="text-gray-600">— useTheme lives here</span></div>
    <div><span className="text-gray-400">npm run dev</span> <span className="text-gray-600"># local setup</span></div>
  </div>
);

const ShipVisual = () => (
  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5 space-y-2.5">
    {['Fork and branch', 'Commit with tests', 'Review addressed'].map((s, i) => (
      <div key={s} className="flex items-center gap-2.5">
        <span className="w-4 h-4 rounded-full bg-green-500/15 border border-green-500/40 flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-green-400" />
        </span>
        <span className="text-[12px] text-gray-300">{s}</span>
        {i === 2 && <span className="ml-auto text-[10px] font-semibold text-blue-300 px-1.5 py-px rounded border border-blue-500/30 bg-blue-500/10">merged</span>}
      </div>
    ))}
  </div>
);

const STEPS: Step[] = [
  {
    icon: Search, kicker: 'Find', title: 'Pick an issue you can actually finish',
    body: 'Filter thousands of open issues by language, labels and activity. Suggestions follow the stack in your own repos.',
    visual: <FindVisual />,
  },
  {
    icon: Sparkles, kicker: 'Understand', title: 'Know what the fix is before you clone',
    body: 'Each issue comes with a short explanation of the problem, the likely files, and how hard it really is.',
    visual: <ExplainVisual />,
  },
  {
    icon: Map, kicker: 'Get oriented', title: 'Learn the codebase in two minutes',
    body: 'Repo onboarding maps the folders, setup commands and conventions, so the first hour isn\'t spent reading config.',
    visual: <OnboardVisual />,
  },
  {
    icon: GitPullRequest, kicker: 'Ship', title: 'Open the PR and get it merged',
    body: 'See what kinds of pull requests the maintainers accept, track your assigned issues, and build a public record of work.',
    visual: <ShipVisual />,
  },
];

const StorySteps = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 70%', 'end 60%'] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.4 });

  return (
    <div ref={ref} className="relative">
      {/* Progress rail that draws itself as you read */}
      <div className="absolute left-[19px] top-2 bottom-2 w-px bg-white/[0.06]" aria-hidden="true">
        <motion.div className="absolute inset-0 origin-top bg-gradient-to-b from-blue-400 to-blue-500/40" style={{ scaleY: progress }} />
      </div>

      <ol className="space-y-16 md:space-y-24">
        {STEPS.map((step, i) => (
          <motion.li
            key={step.kicker}
            className="relative grid md:grid-cols-[1fr_1.1fr] gap-6 md:gap-10 pl-14"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15% 0px' }}
            transition={{ duration: 0.6, ease: easeOut }}
          >
            <span className="absolute left-0 top-0 w-10 h-10 rounded-xl bg-[#2E3245] border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] flex items-center justify-center">
              <step.icon className="w-4 h-4 text-blue-400" />
            </span>
            <div className="pt-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-400/90">
                <span className="font-mono text-gray-500 mr-2">0{i + 1}</span>{step.kicker}
              </p>
              <h3 className="mt-2 text-xl md:text-2xl font-bold tracking-tight text-white leading-snug">{step.title}</h3>
              <p className="mt-3 text-[15px] text-gray-400 leading-relaxed max-w-[46ch]">{step.body}</p>
            </div>
            <div className="md:pt-1">{step.visual}</div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
};

export default StorySteps;
