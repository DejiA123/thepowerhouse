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
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Data reads (REST / storage) fall back to the last copy when offline.
            // Auth, realtime and edge functions are never cached.
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              /\.supabase\.co$/i.test(url.hostname) &&
              !/^\/(auth|realtime|functions)\//.test(url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-data',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 7 },
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