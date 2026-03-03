import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'location-suggestions-dev-endpoint',
      configureServer(server) {
        server.middlewares.use('/api/location-suggestions', async (req, res, next) => {
          try {
            const host = req.headers.host || 'localhost';
            const url = new URL(req.url || '/', `http://${host}`);
            const q = (url.searchParams.get('q') || '').trim();
            const limitParam = Number(url.searchParams.get('limit'));
            const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(limitParam, 10)) : 8;

            if (!q) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end('[]');
              return;
            }

            const upstream = new URL('https://nominatim.openstreetmap.org/search');
            upstream.searchParams.set('format', 'jsonv2');
            upstream.searchParams.set('q', q);
            upstream.searchParams.set('addressdetails', '1');
            upstream.searchParams.set('limit', String(limit));

            const response = await fetch(upstream.toString(), {
              headers: {
                'User-Agent': 'TankTide/1.0 (support@tanktide.com)',
                'Accept-Language': 'en',
              },
            });

            const payload = response.ok ? await response.json() : [];
            const list = Array.isArray(payload) ? payload : [];

            const formatted = list
              .map((item: any) => {
                const address = item?.address || {};
                const city =
                  address.city ||
                  address.town ||
                  address.village ||
                  address.municipality ||
                  address.county ||
                  '';
                const state = address.state || address.region || '';
                const country = address.country || '';
                const compact = [city, state, country].filter(Boolean).join(', ');
                const fallback = String(item?.display_name || '')
                  .split(',')
                  .slice(0, 3)
                  .join(',')
                  .trim();
                const label = compact || fallback || String(item?.name || '').trim();
                if (!label) return null;
                return {
                  place_id: item.place_id || `${item.lat}-${item.lon}-${label}`,
                  display_name: label,
                  label,
                  lat: item.lat || null,
                  lon: item.lon || null,
                };
              })
              .filter(Boolean)
              .filter(
                (item, index, arr) =>
                  arr.findIndex((candidate: any) => candidate.display_name === (item as any).display_name) === index
              );

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(formatted));
          } catch {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end('[]');
          }
        });
      },
    },
  ],
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
