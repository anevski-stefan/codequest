import { useState, useEffect } from 'react';
import { getAIService, subscribeAIService, isAIService } from './aiServiceStorage';
import type { AIService } from './aiServiceStorage';
export type { AIService };
export { isAIService };
export const useAIService = () => {
  const [selectedService, setSelectedService] = useState<AIService>(getAIService);
  useEffect(() => {
    const unsubscribe = subscribeAIService(() => {
      setSelectedService(getAIService());
    });
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ai_service') {
        setSelectedService(isAIService(e.newValue) ? e.newValue : 'chatgpt');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  return selectedService;
};