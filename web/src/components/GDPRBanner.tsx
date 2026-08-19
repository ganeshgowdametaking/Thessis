import React, { useState, useEffect } from 'react';
import { gdprService } from '../services/gdprService';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const applyConsentToGtag = (analytics: boolean, marketing: boolean) => {
  window.gtag?.('consent', 'update', {
    analytics_storage: analytics ? 'granted' : 'denied',
    ad_storage: marketing ? 'granted' : 'denied',
    ad_user_data: marketing ? 'granted' : 'denied',
    ad_personalization: marketing ? 'granted' : 'denied',
  });
};

const GDPRBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = gdprService.getPreferences();
    if (stored) {
      // Google's Consent Mode default resets on every page load, so re-apply
      // the user's saved choice each time rather than only at banner interaction.
      applyConsentToGtag(stored.analytics, stored.marketing);
    } else {
      setVisible(true);
    }
  }, []);

  const handleChoice = (accepted: boolean) => {
    const preferences = {
      necessary: true,
      functional: accepted,
      analytics: accepted,
      marketing: accepted,
    };
    gdprService.saveConsent(preferences);
    if (!accepted) {
      gdprService.clearNonEssentialCookies();
    }
    applyConsentToGtag(preferences.analytics, preferences.marketing);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-olive text-white px-4 py-3 z-50 shadow-lg">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <span className="text-sm leading-snug md:leading-normal">
          We use cookies and similar technologies to enhance your experience. See our{' '}
          <a href="/privacy-policy" className="underline hover:text-primary transition-colors">Privacy Policy</a>
          {' '}and{' '}
          <a href="/cookie-policy" className="underline hover:text-primary transition-colors">Cookie Policy</a>
          {' '}for details.
        </span>
        <div className="flex gap-2 w-full md:w-auto shrink-0">
          <button
            onClick={() => handleChoice(false)}
            className="flex-1 md:flex-none bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-lg font-bold transition-all active:scale-[0.98]"
          >
            Reject Non-Essential
          </button>
          <button
            onClick={() => handleChoice(true)}
            className="flex-1 md:flex-none bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg font-bold transition-all active:scale-[0.98]"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
};

export default GDPRBanner;
