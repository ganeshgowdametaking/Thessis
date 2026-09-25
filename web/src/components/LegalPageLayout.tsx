import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUp, ChevronDown, FileText, Mail, X } from 'lucide-react';

const LEGAL_DOCS = [
  { to: '/privacy-policy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms of Service' },
  { to: '/cookie-policy', label: 'Cookie Policy' },
];

const HEADER_OFFSET = 112; // sticky site header + breathing room

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A numbered section heading; the page's "On this page" list is built from these. */
export const LegalHeading: React.FC<{ id: string; number: number; children: string }> = ({ id, number, children }) => (
  <h2 id={id} data-toc-label={children} className="legal-heading">
    <span aria-hidden="true" className="legal-heading-number">{number}</span>
    <span className="sr-only">{number}. </span>
    {children}
  </h2>
);

interface ContactCardProps {
  title: string;
  body: string;
  showDataRequest?: boolean;
}

const ContactCard: React.FC<ContactCardProps> = ({ title, body, showDataRequest }) => (
  <div className="mt-8 flex flex-col gap-5 rounded-[20px] bg-ink p-6 text-white sm:p-7 md:flex-row md:items-center md:justify-between">
    <div className="flex flex-col gap-1.5">
      <p className="font-display text-xl font-extrabold sm:text-[22px]">{title}</p>
      <p className="max-w-md text-sm leading-relaxed text-white/70">{body}</p>
    </div>
    <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row">
      <a
        href="mailto:info@thessis.com"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-ink transition-colors hover:bg-ink-wash"
      >
        <Mail className="h-4 w-4" />
        info@thessis.com
      </a>
      {showDataRequest && (
        <Link
          to="/data-request"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/30 px-4 text-sm font-bold text-white transition-colors hover:bg-white/10"
        >
          <FileText className="h-4 w-4" />
          Request your data
        </Link>
      )}
    </div>
  </div>
);

interface LegalPageLayoutProps {
  title: string;
  updated: string;
  /** Extra card shown under "On this page" on desktop and after the text on phones. */
  aside?: React.ReactNode;
  contact?: ContactCardProps;
  children: React.ReactNode;
}

type TocItem = { id: string; label: string };

const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({ title, updated, aside, contact, children }) => {
  const { pathname, hash } = useLocation();
  const articleRef = useRef<HTMLDivElement>(null);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showTopButton, setShowTopButton] = useState(false);

  // Build "On this page" from the section headings actually on the page.
  useEffect(() => {
    const headings = articleRef.current?.querySelectorAll<HTMLElement>('h2[data-toc-label]') ?? [];
    setToc([...headings].map((h) => ({ id: h.id, label: h.dataset.tocLabel || '' })));
  }, [pathname]);

  // Highlight the section being read.
  useEffect(() => {
    if (toc.length === 0) return;
    const update = () => {
      let current = 0;
      toc.forEach((item, index) => {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top <= HEADER_OFFSET + 40) current = index;
      });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = toc.length - 1;
      setActiveIndex(current);
      // Hide near the bottom so it never sits on top of the footer links.
      const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 220;
      setShowTopButton(window.scrollY > 800 && !nearBottom);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [toc]);

  const goTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({ top, behavior: reduceMotion() ? 'auto' : 'smooth' });
    window.history.replaceState(null, '', `#${id}`);
  }, []);

  // Links like /privacy-policy#cookies land on the right section.
  useEffect(() => {
    if (!hash || toc.length === 0) return;
    const id = decodeURIComponent(hash.slice(1));
    const timer = window.setTimeout(() => {
      const el = document.getElementById(id);
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [hash, toc]);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheetOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sheetOpen]);

  const toTop = () => window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
  const progress = toc.length ? Math.max(6, Math.round(((activeIndex + 1) / toc.length) * 100)) : 0;
  const active = toc[activeIndex];

  return (
    <div className="bg-parchment">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <header className="flex flex-col gap-3 border-b border-hairline pb-7 pt-8 sm:gap-4 sm:pb-9 sm:pt-12">
          <span className="text-xs font-extrabold uppercase tracking-[0.08em] text-primary">Legal</span>
          <h1 className="font-display text-[34px] font-extrabold leading-tight tracking-[-0.02em] text-ink sm:text-5xl">{title}</h1>
          <p className="text-sm text-slate-500">Last updated {updated}</p>
          <nav aria-label="Legal documents" className="-mx-4 mt-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="flex w-max gap-2">
              {LEGAL_DOCS.map((doc) => {
                const current = doc.to === pathname;
                return (
                  <Link
                    key={doc.to}
                    to={doc.to}
                    aria-current={current ? 'page' : undefined}
                    className={`inline-flex h-9 items-center whitespace-nowrap rounded-full px-3.5 text-[13px] font-bold transition-colors sm:h-10 sm:px-4 sm:text-sm ${
                      current ? 'bg-ink text-white' : 'border border-hairline bg-white text-slate-600 hover:text-ink'
                    }`}
                  >
                    {doc.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </header>

        <div className="flex gap-10 py-6 sm:py-9">
          {/* Desktop: sticky section list */}
          <aside className="hidden w-[290px] shrink-0 lg:block">
            <div className="sticky top-28 flex flex-col gap-4">
              {toc.length > 0 && (
                <nav aria-label="On this page" className="flex max-h-[calc(100vh-9rem)] flex-col gap-1 overflow-y-auto rounded-[18px] border border-hairline bg-white px-3 py-4">
                  <p className="px-3 pb-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">On this page</p>
                  {toc.map((item, index) => {
                    const isActive = index === activeIndex;
                    return (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          goTo(item.id);
                        }}
                        aria-current={isActive ? 'location' : undefined}
                        className={`flex gap-2.5 rounded-[10px] px-3 py-[7px] text-[13.5px] leading-snug transition-colors ${
                          isActive ? 'bg-ink-wash font-bold text-primary-hover' : 'font-medium text-slate-600 hover:bg-parchment hover:text-ink'
                        }`}
                      >
                        <span className={`w-5 shrink-0 text-[12.5px] font-bold ${isActive ? 'text-primary' : 'text-slate-400'}`}>{index + 1}.</span>
                        {item.label}
                      </a>
                    );
                  })}
                  <div className="mx-3 mt-2.5 h-1 rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
                  </div>
                  <button type="button" onClick={toTop} className="mx-3 mt-2 flex items-center gap-1.5 self-start text-[12.5px] font-bold text-slate-500 hover:text-ink">
                    <ArrowUp className="h-3.5 w-3.5" />
                    Back to top
                  </button>
                </nav>
              )}
              {aside}
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            {/* Phones and tablets: one bar that opens the section list */}
            {toc.length > 0 && (
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                aria-haspopup="dialog"
                className="mb-4 flex w-full items-center justify-between rounded-2xl border border-hairline bg-white px-4 py-2.5 text-left shadow-[0_6px_18px_rgba(20,20,43,0.06)] lg:hidden"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="text-[10.5px] font-extrabold uppercase tracking-[0.07em] text-slate-500">On this page</span>
                  <span className="truncate text-[13.5px] font-bold text-ink">
                    {activeIndex + 1}. {active?.label}
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
              </button>
            )}

            <article className="rounded-[22px] border border-hairline bg-white px-5 pb-8 pt-7 sm:px-10 sm:pb-11 sm:pt-9 lg:px-12">
              <div ref={articleRef} className="legal-prose max-w-[720px]">
                {children}
              </div>
              {contact && <ContactCard {...contact} />}
            </article>

            {aside && <div className="mt-5 lg:hidden">{aside}</div>}
          </div>
        </div>
      </div>

      {/* Phones: back to top */}
      <button
        type="button"
        onClick={toTop}
        aria-label="Back to top"
        tabIndex={showTopButton ? 0 : -1}
        className={`fixed bottom-5 right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-ink text-white shadow-[0_10px_24px_rgba(20,20,43,0.25)] transition-opacity lg:hidden ${
          showTopButton ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <ArrowUp className="h-4 w-4" />
      </button>

      {/* Phones: section list sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close" onClick={() => setSheetOpen(false)} className="absolute inset-0 bg-ink/35" />
          <div role="dialog" aria-modal="true" aria-label="On this page" className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-[22px] bg-white px-3 pb-6 pt-3">
            <div className="flex items-center justify-between px-2.5 pb-2">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">On this page</p>
              <button type="button" onClick={() => setSheetOpen(false)} aria-label="Close" autoFocus className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-parchment">
                <X className="h-4 w-4" />
              </button>
            </div>
            {toc.map((item, index) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  setSheetOpen(false);
                  goTo(item.id);
                }}
                className={`flex gap-2.5 rounded-[10px] px-2.5 py-2.5 text-[14px] ${
                  index === activeIndex ? 'bg-ink-wash font-bold text-primary-hover' : 'font-medium text-ink'
                }`}
              >
                <span className={`w-6 shrink-0 font-bold ${index === activeIndex ? 'text-primary' : 'text-slate-400'}`}>{index + 1}.</span>
                {item.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LegalPageLayout;
