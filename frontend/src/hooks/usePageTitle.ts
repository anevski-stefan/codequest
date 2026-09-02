import { useEffect } from 'react';
const BASE_TITLE = 'Code Quest';
const titleStack: string[] = [];
export const usePageTitle = (title?: string) => {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${BASE_TITLE}` : BASE_TITLE;
    titleStack.push(fullTitle);
    document.title = fullTitle;
    return () => {
      const index = titleStack.lastIndexOf(fullTitle);
      if (index !== -1) titleStack.splice(index, 1);
      document.title = titleStack[titleStack.length - 1] ?? BASE_TITLE;
    };
  }, [title]);
};