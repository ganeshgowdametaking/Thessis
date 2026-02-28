import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';
import { analyticsService } from './services/analyticsService.ts';
import { gdprService } from './services/gdprService.ts';
import { PostHogProvider } from '@posthog/react';

const posthogOptions = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
} as const;

if (import.meta.env.DEV) {
  import('./utils/trackingTestUtils.ts');
}

// Only initialize analytics for non-EU users, or for EU users after consent
const isEU = localStorage.getItem('is_eu_user') === 'true';
const consent = localStorage.getItem('gdpr_consent');
if (!isEU || consent === 'true') {
  analyticsService.init();
}

// Track page views when URL changes
const trackPageView = async () => {
  const isEU = localStorage.getItem('is_eu_user') === 'true';
  const consent = localStorage.getItem('gdpr_consent');
  if (!isEU || consent === 'true') {
    const path = window.location.pathname;
    await analyticsService.trackPageView(path);
  }
};

// Track initial page view
trackPageView();

// Track page views on navigation
let currentPath = window.location.pathname;
const observer = new MutationObserver(() => {
  if (window.location.pathname !== currentPath) {
    currentPath = window.location.pathname;
    trackPageView();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PostHogProvider
      apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY as string}
      options={posthogOptions}
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </PostHogProvider>
  </StrictMode>
);
