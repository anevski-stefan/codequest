import { createContext, useContext, useEffect } from 'react';

// The product ships a single dark (Dim/Slate) theme. The provider keeps the
// `dark` class pinned so `dark:` variants resolve regardless of OS setting.
type Theme = 'dark';
interface ThemeContextType {
  theme: Theme;
}
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light');
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  }, []);
  return <ThemeContext.Provider value={{ theme: 'dark' }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
