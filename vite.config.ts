import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8081,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      // The app registers /sw.js itself (see src/lib/serviceWorker.ts)
      injectRegister: false,
      // public/manifest.json is the single source of truth for install metadata
      manifest: false,
      workbox: {
        // Web Push + notification click handling live in public/push-sw.js
        importScripts: ['/push-sw.js'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/functions\//, /^\/auth\//, /\.[a-z0-9]+$/i],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/*.mp4', '**/lovable-uploads/**', '**/assets/academy/**', 'push-sw.js'],
        runtimeCaching: [
          {
            // Images (uploads, avatars, storage) - fast from cache, refreshed in background
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Data reads (REST / storage) fall back to the last copy when offline.
            // Auth, realtime and edge functions are never cached; audio has its own offline store.
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              /\.supabase\.co$/i.test(url.hostname) &&
              !/^\/(auth|realtime|functions)\//.test(url.pathname) &&
              !/\.(mp3|m4a|aac|wav|ogg|mp4|mov|webm)$/i.test(url.pathname) &&
              !request.headers.has('range'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-data',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 1500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] },
              plugins: [
                {
                  // Offline and never asked exactly this before? Lists filtered by date
                  // ("events from today") change their address every day, so answer with
                  // the latest saved copy of the same query, whatever the date in it.
                  handlerDidError: async ({ request }) => {
                    const wanted = new URL(request.url);
                    const shape = (u: URL) => {
                      const out: string[] = [];
                      u.searchParams.forEach((v, k) => out.push(`${k}=${v.replace(/\d{4}-\d{2}-\d{2}[^,)&]*/g, '*')}`));
                      return out.sort().join('&');
                    };
                    const target = shape(wanted);
                    const cache = await caches.open('supabase-data');
                    let best: Response | undefined;
                    let bestDate = -1;
                    for (const key of await cache.keys()) {
                      const url = new URL(key.url);
                      if (url.origin !== wanted.origin || url.pathname !== wanted.pathname || shape(url) !== target) continue;
                      const res = await cache.match(key);
                      const date = res ? Date.parse(res.headers.get('date') || '') || 0 : -1;
                      if (res && date > bestDate) {
                        best = res;
                        bestDate = date;
                      }
                    }
                    return best;
                  },
                },
              ],
            },
          },
          {
            // Bible text and the translation list (API.Bible, Bolls.life), for chapters read before
            urlPattern: ({ url }) =>
              url.hostname === 'api.scripture.api.bible' || (url.hostname === 'bolls.life' && url.pathname.startsWith('/get-')),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'bible-api',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Fonts (Inter, Outfit) so text looks the same with no connection
            urlPattern: ({ url }) => url.hostname === 'fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // Study notes (Tyndale Open Study Notes) rarely change: keep opened chapters for offline study
            urlPattern: ({ url }) => url.hostname === 'bible.helloao.org' && url.pathname.startsWith('/api/c/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'study-notes',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false  // Disable in dev to prevent auto-refresh
      },
      includeAssets: ['favicon.ico', 'icons/*.png', 'push-sw.js'],
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    'process.env': {},
  },
  // Production builds drop debug logging (the app logged thousands of lines per
  // session, which slowed phones). console.warn / console.error are kept.
  esbuild: mode === 'production'
    ? { pure: ['console.log', 'console.debug', 'console.info', 'console.trace'], drop: ['debugger'] }
    : undefined,
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
      },
    },
    chunkSizeWarningLimit: 4000,
    target: 'es2015',
    minify: 'esbuild',
    sourcemap: false,
    assetsInlineLimit: 0,
    reportCompressedSize: false,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', '@supabase/supabase-js'],
    force: true, // Force pre-bundling
  }
}))