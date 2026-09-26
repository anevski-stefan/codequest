import { memo, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleDot, Sparkles, FileCode2, GitMerge, Check } from 'lucide-react';
import { easeOut } from '../../../lib/motion';

// A looping, self-contained product vignette: an issue gets explained,
// the relevant files light up, and the PR lands. Isolated + memoized so the
// loop never re-renders the landing page around it.

const EXPLANATION = [
  'The exporter builds CSV rows before the currency column is resolved,',
  'so rows written in the first batch fall back to the default locale.',
  'Move the lookup above the loop in export.ts and add a test for EUR.',
];

const FILES = [
  { path: 'src/commands/export.ts', hot: true },
  { path: 'src/format/currency.ts', hot: false },
  { path: 'test/export.spec.ts', hot: true },
];

const CYCLE_MS = 9000;

const HeroPreview = memo(() => {
  const [cycle, setCycle] = useState(0);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 900),   // explanation types in
      setTimeout(() => setPhase(2), 3600),  // files highlight
      setTimeout(() => setPhase(3), 5600),  // PR merged toast
      setTimeout(() => { setPhase(0); setCycle(c => c + 1); }, CYCLE_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, [cycle]);

  return (
    <div className="relative">
      {/* Soft light behind the window */}
      <div className="absolute -inset-10 bg-[radial-gradient(closest-side,rgba(59,123,255,0.16),transparent)] pointer-events-none" aria-hidden="true" />

      <div className="relative rounded-2xl border border-white/[0.09] bg-[#2E3245]/90 backdrop-blur-sm shadow-[0_40px_80px_-24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 h-10 border-b border-white/[0.06] bg-white/[0.02]">
          <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <span className="ml-3 text-[11px] font-mono text-gray-500 truncate">tidewater/ledger-cli · issue #412</span>
        </div>

        <div className="p-5 space-y-4">
          {/* Issue header */}
          <div className="flex items-start gap-3">
            <CircleDot className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white leading-snug">CSV export ignores currency for the first 50 rows</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="px-1.5 py-px rounded-md text-[10px] font-semibold border border-green-500/30 bg-green-500/10 text-green-300">good first issue</span>
                <span className="px-1.5 py-px rounded-md text-[10px] font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-200">bug</span>
                <span className="text-[11px] text-gray-500 ml-1">opened 2 days ago · 3 comments</span>
              </div>
            </div>
          </div>

          {/* AI explanation */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.05] p-4 min-h-[128px]">
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-300/90">Explained</span>
              {phase === 0 && (
                <span className="ml-auto flex gap-1" aria-hidden="true">
                  {[0, 1, 2].map(i => (
                    <motion.span
                      key={i}
                      className="w-1 h-1 rounded-full bg-blue-400"
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </span>
              )}
            </div>
            <div className="space-y-1">
              {EXPLANATION.map((line, i) => (
                <motion.p
                  key={`${cycle}-${i}`}
                  className="text-[13px] leading-relaxed text-gray-300"
                  initial={{ opacity: 0, y: 4, filter: 'blur(4px)' }}
                  animate={phase >= 1 ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
                  transition={{ duration: 0.5, delay: i * 0.55, ease: easeOut }}
                >
                  {line}
                </motion.p>
              ))}
            </div>
          </div>

          {/* Files to touch */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2">Where to look</p>
            <div className="space-y-1">
              {FILES.map((f, i) => {
                const lit = phase >= 2 && f.hot;
                return (
                  <motion.div
                    key={f.path}
                    className="flex items-center gap-2.5 px-2.5 h-8 rounded-lg border"
                    animate={{
                      borderColor: lit ? 'rgba(59,123,255,0.35)' : 'rgba(255,255,255,0.05)',
                      backgroundColor: lit ? 'rgba(59,123,255,0.08)' : 'rgba(255,255,255,0.02)',
                    }}
                    transition={{ duration: 0.4, delay: lit ? i * 0.15 : 0 }}
                  >
                    <FileCode2 className={`w-3.5 h-3.5 shrink-0 transition-colors duration-300 ${lit ? 'text-blue-400' : 'text-gray-600'}`} />
                    <span className={`text-[12px] font-mono truncate transition-colors duration-300 ${lit ? 'text-gray-100' : 'text-gray-500'}`}>{f.path}</span>
                    {lit && (
                      <motion.span
                        initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                        className="ml-auto text-[10px] font-semibold text-blue-300"
                      >
                        edit
                      </motion.span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Merged toast — overshoot spring */}
      <AnimatePresence>
        {phase === 3 && (
          <motion.div
            key={`toast-${cycle}`}
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 380, damping: 18 } }}
            exit={{ opacity: 0, y: 8, transition: { duration: 0.2 } }}
            className="absolute -bottom-5 right-4 sm:-right-6 flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-xl bg-[#363B52] border border-white/[0.1] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)]"
          >
            <span className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
              <GitMerge className="w-3.5 h-3.5 text-blue-300" />
            </span>
            <div>
              <p className="text-[12px] font-semibold text-white flex items-center gap-1.5">
                Pull request merged <Check className="w-3 h-3 text-green-400" />
              </p>
              <p className="text-[11px] text-gray-400">#418 · fix currency in CSV export</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

HeroPreview.displayName = 'HeroPreview';
export default HeroPreview;
