import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
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