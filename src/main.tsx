import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import './index.css';
import { analyticsService } from './services/analyticsService.ts';
import { gdprService } from './services/gdprService.ts';

// Initialize analytics only if user has consented
if (gdprService.isAllowed('analytics')) {
  analyticsService.init();
}

// Track page views when URL changes
const trackPageView = () => {
  if (gdprService.isAllowed('analytics')) {
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