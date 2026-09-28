import React, { useState, useEffect } from 'react';
import { gdprService } from '../services/gdprService';

// The Cookie Policy's "Change cookie choice" button reopens the banner; the banner reports new choices back.
export const OPEN_COOKIE_SETTINGS_EVENT = 'thessis:open-cookie-settings';
export const COOKIE_CHOICE_CHANGED_EVENT = 'thessis:cookie-choice-changed';

const GDPRBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const open = () => setVisible(true);
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
  }, []);

  useEffect(() => {
    const stored = gdprService.getPreferences();
    if (!stored) setVisible(true);
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
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-2 bottom-2 z-50 rounded-2xl bg-olive px-3 py-2.5 text-white shadow-lg md:inset-x-0 md:bottom-0 md:rounded-none md:px-4 md:py-3">
      <div className="mx-auto flex max-w-7xl items-center gap-3 md:justify-between">
        <span className="flex-1 text-xs leading-snug md:text-sm md:leading-normal">
          {/* Phones: one compact line so the banner doesn't cover the first screen */}
          <span className="md:hidden">
            Optional usage analytics.{' '}
            <a href="/cookie-policy" className="underline hover:text-primary transition-colors">Details</a>
          </span>
          <span className="hidden md:inline">
            With your permission, we use PostHog to understand visits and feature usage. See our{' '}
            <a href="/privacy-policy" className="underline hover:text-primary transition-colors">Privacy Policy</a>
            {' '}and{' '}
            <a href="/cookie-policy" className="underline hover:text-primary transition-colors">Cookie Policy</a>
            {' '}for details.
          </span>
        </span>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => handleChoice(false)}
            aria-label="Reject non-essential cookies"
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-white/20 active:scale-[0.98] md:px-5 md:py-2.5 md:text-base"
          >
            <span className="md:hidden">Reject</span>
            <span className="hidden md:inline">Reject Non-Essential</span>
          </button>
          <button
            onClick={() => handleChoice(true)}
            aria-label="Accept all cookies"
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-primary-hover active:scale-[0.98] md:px-6 md:py-2.5 md:text-base"
          >
            <span className="md:hidden">Accept</span>
            <span className="hidden md:inline">Accept All</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GDPRBanner;
