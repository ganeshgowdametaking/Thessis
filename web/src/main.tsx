import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';
import { PostHogErrorBoundary, PostHogProvider } from '@posthog/react';

const posthogOptions = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  enable_error_tracking: true,
  defaults: '2026-01-30',
  person_profiles: 'identified_only',
  capture_exceptions: true,
} as const;
const posthogKey = (import.meta.env.VITE_PUBLIC_POSTHOG_KEY || '').trim();

if (import.meta.env.DEV) {
  import('./utils/trackingTestUtils.ts');
}

const appTree = (
  <AuthProvider>
    <App />
  </AuthProvider>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {posthogKey ? (
      <PostHogProvider apiKey={posthogKey} options={posthogOptions}>
        <PostHogErrorBoundary
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-700 p-6 text-center">
              An unexpected error occurred. Please refresh the page.
            </div>
          }
        >
          {appTree}
        </PostHogErrorBoundary>
      </PostHogProvider>
    ) : (
      appTree
    )}
  </StrictMode>
);
