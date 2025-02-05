import { useState, useEffect } from 'react';

type AIService = 'chatgpt' | 'gemini';

export const useAIService = () => {
  const [selectedService, setSelectedService] = useState<AIService>(() => 
    localStorage.getItem('ai_service') as AIService || 'chatgpt'
  );

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ai_service') {
        setSelectedService((e.newValue as AIService) || 'chatgpt');
      }
    };

    const interval = setInterval(() => {
      const currentService = localStorage.getItem('ai_service') as AIService;
      if (currentService !== selectedService) {
        setSelectedService(currentService || 'chatgpt');
      }
    }, 1000);

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [selectedService]);

  return selectedService;
}; 