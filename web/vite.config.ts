import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
    // Keep production console noise down without touching runtime behavior.
    pure: ['console.log', 'console.debug', 'console.info'],
  },
  optimizeDeps: {
    include: ['lucide-react'],
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-pdf': ['pdfjs-dist'],
          'vendor-charts': ['recharts', '@nivo/core', '@nivo/line', '@nivo/pie', '@nivo/bar'],
          'vendor-maps': ['leaflet', 'react-leaflet'],
          'vendor-ui': ['framer-motion', 'lucide-react', 'gsap'],
          'vendor-aws': ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-analytics': ['@posthog/react', 'posthog-js'],
          'vendor-animations': ['ogl'],
          'vendor-data': ['world-countries'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
