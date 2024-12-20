import { useEffect } from 'react';

export const usePageTitle = (title?: string) => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} | Code Quest` : 'Code Quest';

    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}; 