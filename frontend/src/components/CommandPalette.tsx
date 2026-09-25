import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, CornerDownLeft, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { easeOut } from '../lib/motion';

export interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: LucideIcon;
  keywords?: string;
  run: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  items: CommandItem[];
}

const REPO_PATTERN = /^([\w.-]+)\/([\w.-]+)$/;

const CommandPalette = ({ isOpen, onClose, items }: CommandPaletteProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActive(0);
      // Wait for the panel to mount before focusing.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? items.filter(i => `${i.label} ${i.keywords ?? ''} ${i.group}`.toLowerCase().includes(q))
      : items;
    const repo = query.trim().match(REPO_PATTERN);
    if (repo) {
      const [, owner, name] = repo;
      return [
        {
          id: 'open-repo',
          label: `Open ${owner}/${name}`,
          hint: 'Repository',
          group: 'Jump to',
          icon: ArrowUpRight,
          run: () => navigate(`/explore/${owner}/${name}`),
        },
        ...filtered,
      ];
    }
    return filtered;
  }, [items, query, navigate]);

  useEffect(() => { setActive(0); }, [query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const execute = (item?: CommandItem) => {
    if (!item) return;
    onClose();
    item.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); execute(results[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  // Preserve first-seen group order for headings.
  const groups = useMemo(() => {
    const order: string[] = [];
    results.forEach(r => { if (!order.includes(r.group)) order.push(r.group); });
    return order;
  }, [results]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Command menu">
          <motion.div
            className="absolute inset-0 bg-[#0f111a]/70 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.12 } }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.22, ease: easeOut } }}
            exit={{ opacity: 0, y: -4, scale: 0.99, transition: { duration: 0.12 } }}
            className="relative w-full max-w-xl rounded-2xl bg-[#2E3245] border border-white/[0.09] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.07)] overflow-hidden"
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-3 px-4 h-14 border-b border-white/[0.07]">
              <Search className="w-4 h-4 text-gray-500 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search pages, or type owner/repo"
                className="flex-1 bg-transparent text-[15px] text-white placeholder-gray-500 outline-none focus-visible:outline-none"
                aria-label="Command search"
                aria-activedescendant={results[active] ? `cmd-${results[active].id}` : undefined}
              />
              <span className="kbd">Esc</span>
            </div>

            <div ref={listRef} className="max-h-[min(60vh,420px)] overflow-y-auto p-2" role="listbox">
              {results.length === 0 && (
                <p className="px-3 py-10 text-center text-sm text-gray-500">No matches for "{query}"</p>
              )}
              {groups.map(group => (
                <div key={group} className="mb-1 last:mb-0">
                  <p className="px-3 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">{group}</p>
                  {results.map((item, index) => item.group !== group ? null : (
                    <button
                      key={item.id}
                      id={`cmd-${item.id}`}
                      data-index={index}
                      role="option"
                      aria-selected={index === active}
                      onMouseMove={() => setActive(index)}
                      onClick={() => execute(item)}
                      className="relative w-full flex items-center gap-3 px-3 h-10 rounded-lg text-left cursor-pointer"
                    >
                      {index === active && (
                        <motion.span
                          layoutId="cmd-active"
                          className="absolute inset-0 rounded-lg bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                        />
                      )}
                      <item.icon className={`relative w-4 h-4 shrink-0 ${index === active ? 'text-blue-400' : 'text-gray-500'}`} />
                      <span className={`relative text-sm flex-1 truncate ${index === active ? 'text-white' : 'text-gray-300'}`}>{item.label}</span>
                      {item.hint && <span className="relative text-[11px] text-gray-500">{item.hint}</span>}
                      {index === active && <CornerDownLeft className="relative w-3.5 h-3.5 text-gray-500" />}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 px-4 h-10 border-t border-white/[0.06] text-[11px] text-gray-500">
              <span className="flex items-center gap-1.5"><span className="kbd">↑</span><span className="kbd">↓</span>Navigate</span>
              <span className="flex items-center gap-1.5"><span className="kbd">↵</span>Open</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
