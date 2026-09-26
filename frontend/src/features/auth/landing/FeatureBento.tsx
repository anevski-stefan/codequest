import { memo, useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Trophy, Compass, Command, Search } from 'lucide-react';
import { easeOut } from '../../../lib/motion';

// Spotlight tile: the border lights up under the cursor. The pointer
// position is written straight to CSS variables — no React state per move.
const Tile = ({ className = '', children, delay = 0 }: { className?: string; children: ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-10% 0px' }}
    transition={{ duration: 0.6, ease: easeOut, delay }}
    onMouseMove={e => {
      const r = e.currentTarget.getBoundingClientRect();
      e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
      e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
    }}
    className={`group relative rounded-2xl p-px bg-white/[0.07] overflow-hidden ${className}`}
  >
    <div
      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      style={{ background: 'radial-gradient(360px circle at var(--mx) var(--my), rgba(96,150,255,0.35), transparent 40%)' }}
      aria-hidden="true"
    />
    <div className="relative h-full rounded-[15px] bg-[#2A2E40] p-6 md:p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      {children}
    </div>
  </motion.div>
);

const TileHead = ({ icon: Icon, title, body }: { icon: typeof Trophy; title: string; body: string }) => (
  <div className="mb-6">
    <Icon className="w-4 h-4 text-blue-400 mb-3" />
    <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
    <p className="mt-1.5 text-sm text-gray-400 leading-relaxed max-w-[42ch]">{body}</p>
  </div>
);

const ConfidenceMeter = () => (
  <div className="grid sm:grid-cols-2 gap-3">
    {[
      { label: 'Outside PRs merged', value: 72, tier: 'Strong', cls: 'text-green-300 border-green-500/30 bg-green-500/10', bar: 'bg-green-400' },
      { label: 'Top maintainer share', value: 38, tier: 'Low risk', cls: 'text-blue-300 border-blue-500/30 bg-blue-500/10', bar: 'bg-blue-400' },
    ].map((m, i) => (
      <div key={m.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-500">{m.label}</span>
          <span className={`text-[10px] font-semibold px-1.5 py-px rounded border ${m.cls}`}>{m.tier}</span>
        </div>
        <p className="mt-2 text-2xl font-bold text-white tabular">{m.value}%</p>
        <div className="mt-3 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className={`h-full rounded-full origin-left ${m.bar}`}
            style={{ width: `${m.value}%` }}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, ease: easeOut, delay: 0.3 + i * 0.15 }}
          />
        </div>
      </div>
    ))}
  </div>
);

const HACKATHONS = [
  { name: 'Northwind Climate Jam', when: 'Oct 12', where: 'Online' },
  { name: 'Lisbon Chain Build Week', when: 'Oct 19', where: 'Lisbon' },
  { name: 'Open Data Sprint', when: 'Nov 02', where: 'Online' },
  { name: 'Rust Embedded Weekend', when: 'Nov 09', where: 'Berlin' },
  { name: 'Civic Tech Skopje', when: 'Nov 23', where: 'Skopje' },
];

const HackathonTicker = memo(() => (
  <div className="relative h-[148px] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]">
    <motion.div
      className="space-y-1.5"
      animate={{ y: ['0%', '-50%'] }}
      transition={{ duration: 16, ease: 'linear', repeat: Infinity }}
    >
      {[...HACKATHONS, ...HACKATHONS].map((h, i) => (
        <div key={i} className="flex items-center gap-3 px-3 h-9 rounded-lg border border-white/[0.05] bg-white/[0.02]">
          <span className="text-[10px] font-mono text-blue-300 w-12 shrink-0">{h.when}</span>
          <span className="text-[12px] text-gray-200 truncate flex-1">{h.name}</span>
          <span className="text-[10px] text-gray-500 shrink-0">{h.where}</span>
        </div>
      ))}
    </motion.div>
  </div>
));
HackathonTicker.displayName = 'HackathonTicker';

const LANGS = ['TypeScript', 'Python', 'Go', 'Rust', 'Java', 'C#', 'Ruby'];

const LanguageCloud = () => (
  <div className="flex flex-wrap gap-1.5">
    {LANGS.map((l, i) => (
      <motion.span
        key={l}
        className={`px-2.5 h-7 inline-flex items-center rounded-full border text-[12px] font-medium ${i < 2 ? 'border-blue-500/35 bg-blue-500/10 text-blue-200' : 'border-white/[0.08] bg-white/[0.02] text-gray-400'}`}
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 + i * 0.05 }}
      >
        {l}
      </motion.span>
    ))}
  </div>
);

const QUERIES = ['vercel/next.js', 'Suggested Issues', 'rust-lang/rustlings', 'Hackathons'];

const CommandDemo = memo(() => {
  const [q, setQ] = useState(0);
  const [chars, setChars] = useState(0);
  const text = QUERIES[q];

  useEffect(() => {
    if (chars < text.length) {
      const t = setTimeout(() => setChars(c => c + 1), 70);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => { setChars(0); setQ(i => (i + 1) % QUERIES.length); }, 1800);
    return () => clearTimeout(t);
  }, [chars, text.length]);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#252836] overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 h-11 border-b border-white/[0.06]">
        <Search className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-[13px] text-white font-medium">{text.slice(0, chars)}</span>
        <motion.span
          className="w-px h-4 bg-blue-400 -ml-1.5"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
        <span className="ml-auto flex gap-0.5"><span className="kbd">⌘</span><span className="kbd">K</span></span>
      </div>
      <div className="p-2">
        <div className="flex items-center gap-2.5 px-3 h-9 rounded-lg bg-white/[0.05]">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span className="text-[12px] text-gray-200">{text.includes('/') ? `Open ${text}` : text}</span>
          <span className="ml-auto text-[10px] text-gray-500">{chars === text.length ? 'Enter' : ''}</span>
        </div>
      </div>
    </div>
  );
});
CommandDemo.displayName = 'CommandDemo';

const FeatureBento = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <Tile className="md:col-span-2">
      <TileHead
        icon={ShieldCheck}
        title="Know if a repo will review your PR"
        body="Contributor confidence shows how often outside PRs get merged. The lottery factor shows how much rests on one maintainer."
      />
      <ConfidenceMeter />
    </Tile>
    <Tile delay={0.08}>
      <TileHead icon={Trophy} title="Hackathon database" body="Upcoming events from several sources, in one list." />
      <HackathonTicker />
    </Tile>
    <Tile delay={0.04}>
      <TileHead icon={Compass} title="Suggested for your stack" body="Recommendations weighted by the languages you already write." />
      <LanguageCloud />
    </Tile>
    <Tile className="md:col-span-2" delay={0.12}>
      <TileHead icon={Command} title="Keyboard first" body="Jump to any page or any repository from anywhere with one shortcut." />
      <CommandDemo />
    </Tile>
  </div>
);

export default FeatureBento;
