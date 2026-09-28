import { useEffect, type Dispatch, type SetStateAction } from 'react';

const DESKTOP_QUERY = '(min-width: 1024px)';

export function useCloseAtDesktop(setOpen: Dispatch<SetStateAction<boolean>>) {
  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const onChange = (e: MediaQueryListEvent) => { if (e.matches) setOpen(false); };
    desktop.addEventListener('change', onChange);
    return () => desktop.removeEventListener('change', onChange);
  }, [setOpen]);
}
