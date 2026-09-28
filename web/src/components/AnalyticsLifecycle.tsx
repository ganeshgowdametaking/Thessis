import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { productAnalytics } from '../services/productAnalytics';
import { CONSENT_CHANGED, type AnalyticsProperties } from '../services/analyticsPrivacy';

// No visible UI. Only explicitly named landing sections and CTAs are observed.
export default function AnalyticsLifecycle() {
  const {pathname} = useLocation();
  useEffect(() => {
    productAnalytics.start();
    productAnalytics.page(pathname);
    if (pathname !== '/') return;
    const timers = new Map<Element, number>();
    const captured = new Set<Element>();
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.5 || !productAnalytics.isEnabled()) {
          clearTimeout(timers.get(entry.target)); timers.delete(entry.target); continue;
        }
        if (captured.has(entry.target) || timers.has(entry.target)) continue;
        timers.set(entry.target, window.setTimeout(() => {
          timers.delete(entry.target);
          if (!productAnalytics.isEnabled()) return;
          productAnalytics.capture('section_viewed', {section: entry.target.id as AnalyticsProperties['section']});
          captured.add(entry.target);
        }, 1000));
      }
    }, {threshold: [0, 0.5]});
    const observe = () => {
      observer?.disconnect();
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      if (productAnalytics.isEnabled()) document.querySelectorAll('#hero, #how-it-works, #features, #get-started')
        .forEach(element => observer?.observe(element));
    };
    const click = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest('a[href="/signup"], a[href="/login"]');
      if (!link) return;
      productAnalytics.capture('cta_clicked', {cta: link.getAttribute('href') === '/signup' ? 'signup' : 'login',
        placement: link.closest('#hero') ? 'hero' : link.closest('footer') ? 'footer' : 'navigation'});
    };
    observe();
    document.addEventListener('click', click);
    window.addEventListener(CONSENT_CHANGED, observe);
    const storage = (event: StorageEvent) => { if (event.key === 'gdpr_preferences' || event.key === null) observe(); };
    window.addEventListener('storage', storage);
    return () => {
      observer?.disconnect(); for (const timer of timers.values()) clearTimeout(timer);
      document.removeEventListener('click', click);
      window.removeEventListener(CONSENT_CHANGED, observe);
      window.removeEventListener('storage', storage);
    };
  }, [pathname]);
  return null;
}
