import { useState, useEffect } from 'react';
type AIService = 'chatgpt' | 'gemini';
const AI_SERVICES: AIService[] = ['chatgpt', 'gemini'];
const isAIService = (value: string | null): value is AIService =>
  value !== null && (AI_SERVICES as string[]).includes(value);
export const useAIService = () => {
  const [selectedService, setSelectedService] = useState<AIService>(() => {
    const stored = localStorage.getItem('ai_service');
    return isAIService(stored) ? stored : 'chatgpt';
  });
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ai_service') {
        setSelectedService(isAIService(e.newValue) ? e.newValue : 'chatgpt');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  return selectedService;
};