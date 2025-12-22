import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4MB
      },
      devOptions: {
        enabled: true
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
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
    minify: false, // Disable minification to prevent React import issues
    sourcemap: true,
    assetsInlineLimit: 0,
    reportCompressedSize: false,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@supabase/supabase-js'],
    force: true, // Force pre-bundling
  }
}))