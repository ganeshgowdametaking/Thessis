import { useEffect, useId, useRef, useState, type ReactNode, type ReactPortal } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft } from 'lucide-react';

// Used only below the app's 768px desktop boundary.
export default function MobileDialog({ title, onClose, children, footer, className = '' }: {
  title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; className?: string;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const [viewport, setViewport] = useState<{ height: number; top: number } | null>(null);
  useEffect(() => {
    const update = () => {
      const view = window.visualViewport;
      if (view) setViewport({ height: view.height, top: view.offsetTop });
    };
    update();
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    const background = Array.from(document.body.children).filter(item => item instanceof HTMLElement && !item.contains(panel.current)) as HTMLElement[];
    const wasInert = background.map(item => item.inert);
    background.forEach(item => { item.inert = true; });
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const items = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') || [])
        .filter(item => item.getClientRects().length > 0);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      background.forEach((item, index) => { item.inert = wasInert[index]; });
      document.removeEventListener('keydown', handleKey);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  return createPortal(
    <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId}
      className={`mobile-dialog ${className}`} style={viewport ? { height: viewport.height, top: viewport.top } : undefined}>
      <header className="mobile-dialog-header">
        <button type="button" className="mobile-icon-button" onClick={onClose} aria-label={`Back from ${title.toLowerCase()}`}><ArrowLeft size={21} /></button>
        <h2 id={titleId}>{title}</h2>
      </header>
      <div className="mobile-dialog-body">{children}</div>
      {footer && <footer className="mobile-dialog-footer">{footer}</footer>}
    </div>, document.body) as ReactPortal;
}
