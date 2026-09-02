export type AIService = 'chatgpt' | 'gemini';
const AI_SERVICES: AIService[] = ['chatgpt', 'gemini'];
const STORAGE_KEY = 'ai_service';
const listeners = new Set<() => void>();
export const isAIService = (value: string | null): value is AIService =>
  value !== null && (AI_SERVICES as string[]).includes(value);
export const getAIService = (): AIService => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return isAIService(stored) ? stored : 'chatgpt';
};
export const setAIService = (value: AIService): void => {
  localStorage.setItem(STORAGE_KEY, value);
  listeners.forEach(listener => listener());
};
export const subscribeAIService = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};