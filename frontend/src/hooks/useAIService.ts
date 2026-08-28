import { useState, useEffect } from 'react';
type AIService = 'chatgpt' | 'gemini';
export const useAIService = () => {
  const [selectedService, setSelectedService] = useState<AIService>(() => localStorage.getItem('ai_service') as AIService || 'chatgpt');
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ai_service') {
        setSelectedService(e.newValue as AIService || 'chatgpt');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  return selectedService;
};