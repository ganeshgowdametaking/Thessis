import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';
import { PostHogProvider } from '@posthog/react';

const posthogOptions = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
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
        {appTree}
      </PostHogProvider>
    ) : (
      appTree
    )}
  </StrictMode>
);
