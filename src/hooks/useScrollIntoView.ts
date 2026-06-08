import { useEffect } from 'react';

export function useScrollInputIntoView() {
  useEffect(() => {
    const handler = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') return;
      // Let the browser position first, then nudge if needed
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
    };
    document.addEventListener('focusin', handler, true);
    return () => document.removeEventListener('focusin', handler, true);
  }, []);
}
