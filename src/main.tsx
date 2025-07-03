import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';
import { analyticsService } from './services/analyticsService.ts';
import { gdprService } from './services/gdprService.ts';

// Only initialize analytics for non-EU users, or for EU users after consent
const isEU = localStorage.getItem('is_eu_user') === 'true';
const consent = localStorage.getItem('gdpr_consent');
if (!isEU || consent === 'true') {
  analyticsService.init();
}

// Track page views when URL changes
const trackPageView = () => {
  const isEU = localStorage.getItem('is_eu_user') === 'true';
  const consent = localStorage.getItem('gdpr_consent');
  if (!isEU || consent === 'true') {
    const path = window.location.pathname;
    analyticsService.trackPageView(path);
  }
};

// Listen for URL changes to track page views
window.addEventListener('popstate', trackPageView);

// Initial page view tracking
trackPageView();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);