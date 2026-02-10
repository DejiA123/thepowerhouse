import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp}'], // Exclude mp4 from precache
        globIgnores: ['**/*.mp4'], // Explicitly ignore large video files
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false  // Disable in dev to prevent auto-refresh
      },
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'The Power House App',
        short_name: 'PowerHouse',
        description: 'The Power House International Church App',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/lovable-uploads/17d2a568-fd22-4680-827b-b659c3433008.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/lovable-uploads/17d2a568-fd22-4680-827b-b659c3433008.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    'process.env': {},
    global: 'window',
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
      },
      output: {
        // Force React and React-DOM into main chunk to prevent loading issues
        manualChunks: {
          'react-core': ['react', 'react-dom'],
          'vendor': ['@supabase/supabase-js', 'lucide-react', 'class-variance-authority', 'clsx', 'tailwind-merge'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
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