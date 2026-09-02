import { useState, useEffect } from 'react';
import { Settings, Key, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import toast from 'react-hot-toast';
import { api } from '../../services/github';
import { isAIService } from '../../hooks/useAIService';
import type { AIService } from '../../hooks/useAIService';
const SettingsPage = () => {
  usePageTitle('Settings');
  const {
    theme: currentTheme,
    setTheme
  } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);
  const [chatgptKey, setChatgptKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [selectedService, setSelectedService] = useState<AIService>('chatgpt');
  const [isSaving, setIsSaving] = useState(false);
  const [configured, setConfigured] = useState<{ chatgpt: boolean; gemini: boolean }>({ chatgpt: false, gemini: false });
  const [toDelete, setToDelete] = useState<Set<AIService>>(new Set());
  useEffect(() => {
    const savedService = localStorage.getItem('ai_service');
    setSelectedService(isAIService(savedService) ? savedService : 'chatgpt');
    api.get('/api/ai-keys').then(r => setConfigured(r.data)).catch(() => {});
  }, []);
  const handleServiceChange = (service: AIService) => {
    setSelectedService(service);
    setTimeout(() => {
      const input = document.getElementById(`${service}-input`);
      if (input) {
        input.focus();
      }
    }, 0);
  };
  const clearKey = (service: AIService) => {
    if (service === 'chatgpt') {
      setChatgptKey('');
    } else {
      setGeminiKey('');
    }
    setToDelete(prev => new Set(prev).add(service));
  };
  const validateApiKey = (service: AIService, key: string): boolean => {
    if (!key) return true;
    if (service === 'chatgpt') {
      return key.length >= 20;
    } else if (service === 'gemini') {
      return key.length >= 20;
    }
    return false;
  };
  const handleSaveChanges = async () => {
    if (chatgptKey && !validateApiKey('chatgpt', chatgptKey)) {
      toast.error('Invalid ChatGPT API key format');
      return;
    }
    if (geminiKey && !validateApiKey('gemini', geminiKey)) {
      toast.error('Invalid Gemini API key format');
      return;
    }
    setIsSaving(true);
    try {
      setTheme(selectedTheme);
      localStorage.setItem('ai_service', selectedService);
      const ops: Promise<unknown>[] = [];
      if (chatgptKey) {
        ops.push(api.put('/api/ai-keys/chatgpt', { key: chatgptKey }));
      } else if (toDelete.has('chatgpt')) {
        ops.push(api.delete('/api/ai-keys/chatgpt'));
      }
      if (geminiKey) {
        ops.push(api.put('/api/ai-keys/gemini', { key: geminiKey }));
      } else if (toDelete.has('gemini')) {
        ops.push(api.delete('/api/ai-keys/gemini'));
      }
      await Promise.all(ops);
      setToDelete(new Set());
      const status = await api.get('/api/ai-keys').then(r => r.data);
      setConfigured(status);
      toast.success('Settings saved successfully!');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };
  return <div className="flex flex-col flex-1 dark:bg-[#0B1222] mt-8 p-4 md:p-6">
      <div className="bg-white dark:bg-[#0B1222] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-white/10">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
          <Settings className="w-5 h-5" />
          Settings
        </h2>
        
        {}
        <div className="mb-8">
          <h4 className="text-md font-medium mb-4 text-gray-900 dark:text-white">Theme</h4>
          <select aria-label="Theme" value={selectedTheme} onChange={e => setSelectedTheme(e.target.value as 'light' | 'dark' | 'system')} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm rounded-lg bg-white dark:bg-[#0B1222] text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
            <option value="light" className="bg-white dark:bg-[#0B1222]">Light</option>
            <option value="dark" className="bg-white dark:bg-[#0B1222]">Dark</option>
            <option value="system" className="bg-white dark:bg-[#0B1222]">System</option>
          </select>
        </div>

        {}
        <div className="mb-8">
          <h4 className="text-md font-medium mb-4 text-gray-900 dark:text-white">AI Service</h4>
          <div className="space-y-4">
            <div>
              <label className="flex items-center space-x-2">
                <input type="radio" value="chatgpt" checked={selectedService === 'chatgpt'} onChange={e => handleServiceChange(e.target.value as AIService)} className="text-blue-600 focus:ring-blue-500" />
                <span className="text-gray-900 dark:text-white">ChatGPT</span>
              </label>
              <div className="mt-2">
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input id="chatgpt-input" type="password" value={chatgptKey} onChange={e => setChatgptKey(e.target.value)} placeholder={configured.chatgpt ? 'Saved — enter a new key to replace' : 'Enter ChatGPT API Key'} disabled={selectedService !== 'chatgpt'} className={`pl-9 pr-9 w-full border border-gray-300 dark:border-gray-700 rounded-lg py-2 px-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#0B1222] text-gray-900 dark:text-white ${selectedService !== 'chatgpt' ? 'opacity-50 cursor-not-allowed' : ''}`} />
                  {chatgptKey && <button onClick={() => clearKey('chatgpt')} disabled={selectedService !== 'chatgpt'} className={`absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ${selectedService !== 'chatgpt' ? 'cursor-not-allowed' : ''}`}>
                      <X className="h-4 w-4" />
                    </button>}
                </div>
              </div>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input type="radio" value="gemini" checked={selectedService === 'gemini'} onChange={e => handleServiceChange(e.target.value as AIService)} className="text-blue-600 focus:ring-blue-500" />
                <span className="text-gray-900 dark:text-white">Gemini</span>
              </label>
              <div className="mt-2">
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input id="gemini-input" type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder={configured.gemini ? 'Saved — enter a new key to replace' : 'Enter Gemini API Key'} disabled={selectedService !== 'gemini'} className={`pl-9 pr-9 w-full border border-gray-300 dark:border-gray-700 rounded-lg py-2 px-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#0B1222] text-gray-900 dark:text-white ${selectedService !== 'gemini' ? 'opacity-50 cursor-not-allowed' : ''}`} />
                  {geminiKey && <button onClick={() => clearKey('gemini')} disabled={selectedService !== 'gemini'} className={`absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ${selectedService !== 'gemini' ? 'cursor-not-allowed' : ''}`}>
                      <X className="h-4 w-4" />
                    </button>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {}
        <div className="flex justify-end">
          <button type="button" disabled={isSaving} className={`px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors shadow-sm ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={handleSaveChanges}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>;
};
export default SettingsPage;