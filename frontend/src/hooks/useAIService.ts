import { useSyncExternalStore } from 'react';

export type AIService = 'chatgpt' | 'gemini';

const STORAGE_KEY = 'ai_service';

export const isAIService = (value: string | null): value is AIService => 
  value === 'chatgpt' || value === 'gemini';

// Gemini is the recommended default (free tier). The backend falls back to
// whichever provider the user actually has a key for.
export const getAIService = (): AIService => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isAIService(stored) ? stored : 'gemini';
  } catch {
    return 'gemini';
  }
};

export const setAIService = (value: AIService): void => {
  localStorage.setItem(STORAGE_KEY, value);
  window.dispatchEvent(new Event('ai_service_changed'));
};

const subscribe = (listener: () => void) => {
  window.addEventListener('storage', listener);
  window.addEventListener('ai_service_changed', listener);
  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener('ai_service_changed', listener);
  };
};

export const useAIService = () => useSyncExternalStore(subscribe, getAIService);