import { useState, useEffect, type ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Key, Check, Sparkles, Eye, EyeOff, ArrowUpRight, LogOut, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePageTitle } from '../../hooks/usePageTitle';
import { api } from '../../services/github';
import { setAIService, isAIService } from '../../hooks/useAIService';
import type { AIService } from '../../hooks/useAIService';
import useAuth from '../../hooks/useAuth';
import type { RootState } from '../../store';
import PageHeader from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { easeOut } from '../../lib/motion';

const AI_PROVIDERS = [
  {
    value: 'gemini' as AIService,
    label: 'Gemini',
    badge: 'Recommended',
    description: 'Google Gemini. Fast, capable, generous free tier.',
    placeholder: 'AIza…',
    keyUrl: 'https://aistudio.google.com/apikey',
    keyHost: 'Google AI Studio',
  },
  {
    value: 'chatgpt' as AIService,
    label: 'ChatGPT',
    badge: null,
    description: 'OpenAI GPT-4o. Strong reasoning, paid usage.',
    placeholder: 'sk-…',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyHost: 'OpenAI dashboard',
  },
] as const;

const Section = ({ title, description, children }: { title: string; description: string; children: ReactNode }) => (
  <section className="grid md:grid-cols-[240px_minmax(0,1fr)] gap-4 md:gap-10 py-8 first:pt-2 border-b border-white/[0.05] last:border-b-0">
    <div>
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <p className="text-[13px] text-gray-500 mt-1 leading-relaxed">{description}</p>
    </div>
    <div className="min-w-0">{children}</div>
  </section>
);

export default function SettingsPage() {
  usePageTitle('Settings');
  const queryClient = useQueryClient();
  const { user } = useSelector((s: RootState) => s.auth);
  const { logout } = useAuth();

  const [savedService, setSavedService] = useState<AIService>('gemini');
  const [selectedService, setSelectedService] = useState<AIService>('gemini');
  const [keys, setKeys] = useState<Record<AIService, string>>({ gemini: '', chatgpt: '' });
  const [reveal, setReveal] = useState<Record<AIService, boolean>>({ gemini: false, chatgpt: false });
  const [toDelete, setToDelete] = useState<Set<AIService>>(new Set());
  const [configured, setConfigured] = useState<Record<AIService, boolean> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('ai_service');
    const service = isAIService(stored) ? stored : 'gemini';
    setSelectedService(service);
    setSavedService(service);
    api.get('/api/ai-keys').then(r => setConfigured(r.data)).catch(() => setConfigured({ gemini: false, chatgpt: false }));
  }, []);

  const isDirty = selectedService !== savedService || !!keys.gemini || !!keys.chatgpt || toDelete.size > 0;

  const discard = () => {
    setSelectedService(savedService);
    setKeys({ gemini: '', chatgpt: '' });
    setToDelete(new Set());
  };

  const handleSave = async () => {
    const invalid = (Object.keys(keys) as AIService[]).find(s => keys[s] && keys[s].length < 20);
    if (invalid) {
      toast.error(`That ${invalid === 'gemini' ? 'Gemini' : 'OpenAI'} key looks too short. Paste the full key.`);
      return;
    }
    setIsSaving(true);
    try {
      setAIService(selectedService);
      const ops: Promise<unknown>[] = [];
      (Object.keys(keys) as AIService[]).forEach(s => {
        if (keys[s]) ops.push(api.put(`/api/ai-keys/${s}`, { key: keys[s] }));
        else if (toDelete.has(s)) ops.push(api.delete(`/api/ai-keys/${s}`));
      });
      await Promise.all(ops);
      const status = await api.get('/api/ai-keys').then(r => r.data);
      setConfigured(status);
      setSavedService(selectedService);
      setKeys({ gemini: '', chatgpt: '' });
      setToDelete(new Set());
      queryClient.invalidateQueries({ queryKey: ['ai-keys'] });
      toast.success('Settings saved');
    } catch {
      toast.error("Couldn't save settings. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      <div className="px-6 lg:px-8 pt-7 shrink-0">
        <PageHeader eyebrow="Account" title="Settings" subtitle="AI provider, API keys and your account" />
        <div className="border-b border-white/[0.05]" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 lg:px-8 max-w-5xl pb-28">

          <Section
            title="AI assistant"
            description="Powers issue explanations and onboarding guides. Keys are encrypted at rest, never logged, and only used for your requests."
          >
            <div role="radiogroup" aria-label="AI provider" className="grid sm:grid-cols-2 gap-3">
              {AI_PROVIDERS.map(p => {
                const active = selectedService === p.value;
                const saved = configured?.[p.value] && !toDelete.has(p.value);
                return (
                  <div
                    key={p.value}
                    role="radio"
                    aria-checked={active}
                    tabIndex={active ? 0 : -1}
                    onClick={() => setSelectedService(p.value)}
                    onKeyDown={e => {
                      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setSelectedService(p.value); }
                      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        setSelectedService(p.value === 'gemini' ? 'chatgpt' : 'gemini');
                      }
                    }}
                    className={`relative flex flex-col gap-4 p-5 rounded-2xl border cursor-pointer transition-colors ${
                      active
                        ? 'border-blue-500/45 bg-blue-500/[0.05] shadow-[inset_0_1px_0_rgba(59,123,255,0.1)]'
                        : 'border-white/[0.08] bg-[#2E3245] hover:border-white/[0.15]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-white">{p.label}</p>
                          {p.badge && (
                            <span className="inline-flex items-center gap-1 px-1.5 h-5 text-[10px] font-semibold rounded-md bg-blue-500/[0.12] border border-blue-500/25 text-blue-300">
                              <Sparkles className="w-2.5 h-2.5" />{p.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-gray-400 mt-1 leading-relaxed">{p.description}</p>
                      </div>
                      <span className={`mt-0.5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${active ? 'border-blue-400 bg-blue-500' : 'border-white/20'}`}>
                        {active && <motion.span layoutId="provider-dot" className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>

                    <div onClick={e => e.stopPropagation()} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label htmlFor={`key-${p.value}`} className="text-[12px] font-semibold text-gray-300">API key</label>
                        {configured === null ? (
                          <Skeleton className="h-4 w-14" />
                        ) : saved ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-400">
                            <Check className="w-3 h-3" />Saved
                          </span>
                        ) : toDelete.has(p.value) ? (
                          <span className="text-[11px] font-semibold text-amber-300">Will be removed</span>
                        ) : (
                          <span className="text-[11px] text-gray-500">Not set</span>
                        )}
                      </div>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
                        <input
                          id={`key-${p.value}`}
                          type={reveal[p.value] ? 'text' : 'password'}
                          value={keys[p.value]}
                          onFocus={() => setSelectedService(p.value)}
                          onChange={e => setKeys(k => ({ ...k, [p.value]: e.target.value.trim() }))}
                          placeholder={saved ? 'Paste a new key to replace' : p.placeholder}
                          autoComplete="off"
                          spellCheck={false}
                          aria-describedby={`key-help-${p.value}`}
                          className="w-full h-10 pl-9 pr-10 text-[13px] font-mono bg-[#252836] border border-white/[0.09] rounded-xl text-gray-100 placeholder:font-sans placeholder-gray-500 focus:outline-none focus-visible:outline-none focus:border-blue-500/50 focus:shadow-[0_0_0_3px_rgba(59,123,255,0.12)] transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setReveal(r => ({ ...r, [p.value]: !r[p.value] }))}
                          aria-label={reveal[p.value] ? 'Hide key' : 'Show key'}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
                        >
                          {reveal[p.value] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <div id={`key-help-${p.value}`} className="flex items-center justify-between gap-2 text-[11px]">
                        <a href={p.keyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-gray-500 hover:text-blue-300 transition-colors">
                          Get a key from {p.keyHost}<ArrowUpRight className="w-3 h-3" />
                        </a>
                        {saved && (
                          <button
                            type="button"
                            onClick={() => { setToDelete(prev => new Set(prev).add(p.value)); setKeys(k => ({ ...k, [p.value]: '' })); }}
                            className="inline-flex items-center gap-1 text-gray-500 hover:text-red-300 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="Account" description="Code Quest signs you in with GitHub. We only access public repositories.">
            <div className="rounded-2xl border border-white/[0.08] bg-[#2E3245] divide-y divide-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <div className="flex items-center gap-4 p-5">
                {user?.avatar_url && <img src={user.avatar_url} alt="" width={44} height={44} className="w-11 h-11 rounded-full ring-1 ring-white/10" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{user?.name ?? user?.login}</p>
                  <p className="text-[12px] text-gray-500 truncate">Connected as @{user?.login}</p>
                </div>
                <a
                  href={`https://github.com/${user?.login ?? ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-white/[0.09] text-[12px] font-semibold text-gray-300 hover:text-white hover:border-white/[0.18] transition-colors"
                >
                  GitHub<ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="text-[13px] font-semibold text-gray-200">Sign out</p>
                  <p className="text-[12px] text-gray-500 mt-0.5">Ends your session on this device.</p>
                </div>
                <button
                  onClick={() => logout()}
                  className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-red-500/25 bg-red-500/[0.06] text-[12px] font-semibold text-red-300 hover:bg-red-500/[0.12] active:scale-[0.97] transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />Sign out
                </button>
              </div>
            </div>
          </Section>
        </div>
      </div>

      {/* Save bar — only when something changed */}
      <AnimatePresence>
        {isDirty && (
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { duration: 0.3, ease: easeOut } }}
            exit={{ y: 16, opacity: 0, transition: { duration: 0.15 } }}
            className="absolute inset-x-0 bottom-5 z-30 flex justify-center px-4 pointer-events-none"
          >
            <div role="status" className="pointer-events-auto w-full max-w-lg flex items-center gap-3 pl-4 pr-2 py-2 rounded-xl bg-[#363B52] border border-white/[0.1] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300 shrink-0" />
              <p className="flex-1 text-[13px] text-gray-200">You have unsaved changes</p>
              <button onClick={discard} disabled={isSaving} className="h-8 px-3 rounded-lg text-[12px] font-semibold text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer">
                Discard
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-[12px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] active:scale-[0.97] disabled:opacity-60 transition-all cursor-pointer"
              >
                {isSaving && <span className="w-3 h-3 rounded-full border-[1.5px] border-white/30 border-t-white animate-spin" />}
                {isSaving ? 'Saving' : 'Save changes'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
