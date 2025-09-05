# 🔧 Lovable Deployment Fix Guide

## Build Issues Fixed

### 1. ✅ Dependencies Installation
- All npm dependencies have been installed
- The project now builds successfully with `npm run build`

### 2. ✅ Vite Configuration Update
- Fixed ESM module import issue in `vite.config.ts`
- Changed from `__dirname` to `import.meta.url` for proper ESM compatibility
- This ensures the build works correctly in Lovable's environment

### 3. ✅ Environment Variables Documentation
- Created `.env.example` file documenting required environment variables
- The app requires these environment variables to function properly:
  - `VITE_SUPABASE_URL` - Your Supabase project URL
  - `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
  - `VITE_ELEVENLABS_API_KEY` - ElevenLabs API key for Max McLean TTS

## Deployment Steps for Lovable

1. **Configure Environment Variables in Lovable:**
   - Go to your Lovable project settings
   - Add the required environment variables listed above
   - Ensure the values match your Supabase project configuration

2. **Verify Build Configuration:**
   - The project uses Vite with React and TypeScript
   - Build output is in the `dist` directory
   - The main entry point is `index.html`

3. **Check Supabase Edge Functions:**
   - The app depends on Supabase edge functions (see `/supabase/functions/`)
   - Ensure these are deployed to your Supabase project:
     - `bible-brain-api`
     - `fetch-daily-scripture-video`
     - `fetch-youtube-videos`
     - `generate-audio-file`

4. **Build Optimizations:**
   - The build is configured with code splitting for better performance
   - Chunks are organized by vendor type (react, radix-ui, tiptap, etc.)
   - Console logs are removed in production builds

## Common Issues and Solutions

1. **"Unidentified error" during build:**
   - Usually caused by missing environment variables
   - Ensure all variables in `.env.example` are configured in Lovable

2. **Build timeouts:**
   - The project has many dependencies which can take time to install
   - If build times out, try triggering a rebuild

3. **Runtime errors:**
   - Check browser console for missing API keys
   - Verify Supabase URL and keys are correct

## Build Command
```bash
npm run build
```

## Build Output
- Output directory: `dist/`
- Main file: `dist/index.html`
- Assets: `dist/assets/`

## Additional Notes
- The project uses PWA features (Progressive Web App)
- TypeScript is configured with relaxed settings for compatibility
- ESLint warnings don't block the build