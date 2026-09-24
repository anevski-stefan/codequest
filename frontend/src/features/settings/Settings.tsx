import { useState, useEffect } from 'react';
import { Key, X, Check, Loader2, Sparkles, Bot } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import toast from 'react-hot-toast';
import { api } from '../../services/github';
import { setAIService, isAIService } from '../../hooks/useAIService';
import type { AIService } from '../../hooks/useAIService';

const AI_PROVIDERS = [
  {
    value: 'gemini' as AIService,
    label: 'Gemini',
    badge: 'Recommended',
    description: 'Google Gemini — fast, capable, generous free tier',
    placeholder: 'AIza…',
  },
  {
    value: 'chatgpt' as AIService,
    label: 'ChatGPT',
    badge: null,
    description: 'OpenAI GPT-4o — industry-leading language model',
    placeholder: 'sk-…',
  },
] as const;

export default function SettingsPage() {
  usePageTitle('Settings');
  const [chatgptKey, setChatgptKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [selectedService, setSelectedService] = useState<AIService>('gemini');
  const [isSaving, setIsSaving] = useState(false);
  const [configured, setConfigured] = useState<{ chatgpt: boolean; gemini: boolean }>({ chatgpt: false, gemini: false });
  const [toDelete, setToDelete] = useState<Set<AIService>>(new Set());

  useEffect(() => {
    const savedService = localStorage.getItem('ai_service');
    setSelectedService(isAIService(savedService) ? savedService : 'gemini');
    api.get('/api/ai-keys').then(r => setConfigured(r.data)).catch(() => {});
  }, []);

  const clearKey = (service: AIService) => {
    if (service === 'chatgpt') setChatgptKey('');
    else setGeminiKey('');
    setToDelete(prev => new Set(prev).add(service));
  };

  const handleSave = async () => {
    const validate = (key: string) => !key || key.length >= 20;
    if (!validate(chatgptKey)) { toast.error('Invalid ChatGPT API key'); return; }
    if (!validate(geminiKey)) { toast.error('Invalid Gemini API key'); return; }
    setIsSaving(true);
    try {
      setAIService(selectedService);
      const ops: Promise<unknown>[] = [];
      if (chatgptKey) ops.push(api.put('/api/ai-keys/chatgpt', { key: chatgptKey }));
      else if (toDelete.has('chatgpt')) ops.push(api.delete('/api/ai-keys/chatgpt'));
      if (geminiKey) ops.push(api.put('/api/ai-keys/gemini', { key: geminiKey }));
      else if (toDelete.has('gemini')) ops.push(api.delete('/api/ai-keys/gemini'));
      await Promise.all(ops);
      setToDelete(new Set());
      const status = await api.get('/api/ai-keys').then(r => r.data);
      setConfigured(status);
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const keyFor = (s: AIService) => s === 'gemini' ? geminiKey : chatgptKey;
  const setKeyFor = (s: AIService, v: string) => s === 'gemini' ? setGeminiKey(v) : setChatgptKey(v);

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="px-6 pt-6 pb-0 shrink-0">
        <div className="mb-4">
          <h1 className="text-lg font-bold text-white">Settings</h1>
          <p className="text-xs text-gray-600 mt-0.5">Manage your preferences and API keys</p>
        </div>
        <div className="flex items-center gap-1 border-b border-white/[0.05]">
          <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 border-blue-500 text-white -mb-px cursor-default">
            <Bot className="w-3.5 h-3.5 text-blue-400" />
            AI &amp; APIs
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-white/[0.05]">

          {/* Section intro */}
          <div className="px-6 py-5">
            <p className="text-xs text-gray-600 leading-relaxed max-w-xl">
              Select your AI provider and add your API key. Keys are stored encrypted and never shared. The active provider powers issue explanations and contribution tips across the app.
            </p>
          </div>

          {/* Provider rows */}
          {AI_PROVIDERS.map(({ value, label, badge, description, placeholder }) => {
            const active = selectedService === value;
            const isConfigured = configured[value];
            const currentKey = keyFor(value);

            return (
              <div
                key={value}
                className={`flex flex-col sm:flex-row items-start gap-4 sm:gap-8 px-6 py-6 transition-colors ${active ? 'bg-blue-500/[0.02]' : ''}`}
              >
                {/* Left: info */}
                <div className="w-full sm:w-64 sm:shrink-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-200">{label}</p>
                    {badge && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-violet-500/[0.12] border border-violet-500/20 text-violet-400">
                        <Sparkles className="w-2.5 h-2.5" />
                        {badge}
                      </span>
                    )}
                    {isConfigured && !currentKey && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-green-500/[0.10] border border-green-500/20 text-green-400">
                        <Check className="w-2.5 h-2.5" />
                        Saved
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
                </div>

                {/* Right: controls */}
                <div className="w-full sm:flex-1 flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                  <button
                    onClick={() => setSelectedService(value)}
                    className={`flex items-center gap-2.5 px-4 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-all shrink-0 ${
                      active
                        ? 'border-blue-500/40 bg-blue-500/[0.08] text-white'
                        : 'border-white/[0.08] bg-[#0D1525] text-gray-500 hover:text-gray-300 hover:border-white/[0.14]'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${active ? 'border-blue-500 bg-blue-500' : 'border-white/20'}`}>
                      {active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    Use {label}
                  </button>

                  <div className="relative flex-1">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none" />
                    <input
                      type="password"
                      value={currentKey}
                      onChange={e => setKeyFor(value, e.target.value)}
                      placeholder={isConfigured ? 'Saved — enter new key to replace' : placeholder}
                      autoComplete="off"
                      className="w-full h-9 pl-9 pr-9 text-xs bg-[#0D1525] border border-white/[0.08] rounded-lg text-gray-300 placeholder-gray-700 focus:outline-none focus:border-blue-500/50 transition-all"
                    />
                    {currentKey && (
                      <button
                        onClick={() => clearKey(value)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Save row */}
          <div className="flex items-center justify-between px-6 py-4">
            <p className="text-xs text-gray-700">API keys are encrypted at rest and never logged</p>
            <SaveButton isSaving={isSaving} onClick={handleSave} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SaveButton({ isSaving, onClick }: { isSaving: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={isSaving}
      onClick={onClick}
      className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
    >
      {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {isSaving ? 'Saving…' : 'Save Changes'}
    </button>
  );
}
