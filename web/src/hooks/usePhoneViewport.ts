import { useEffect, useState, type CSSProperties } from 'react';

// The visual viewport shrinks when a phone keyboard opens; desktop is untouched.
export function usePhoneViewport(enabled: boolean): CSSProperties | undefined {
  const [viewport, setViewport] = useState<CSSProperties>();
  useEffect(() => {
    if (!enabled) return;
    const update = () => {
      const view = window.visualViewport;
      setViewport({ height: view?.height ?? window.innerHeight, top: view?.offsetTop ?? 0 });
    };
    update();
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, [enabled]);
  return enabled ? viewport : undefined;
}
