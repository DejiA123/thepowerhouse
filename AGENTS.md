# Technical decisions

- Vite `build.target` must be the single string `'es2020'`, never a multi-engine list like `['es2020', 'safari14']`: esbuild 0.27.2's transform API falsely reports destructuring as unsupported when the target list contains multiple engines (fixed by Grafana et al. in esbuild 0.27.5+). If esbuild is ever upgraded past 0.27.2, a list can be restored if needed.
- Keep the `es2020` floor (Safari 14+): many members use older iPhones, so do not raise the build target above it.
- The AI Bible voice runs in the cloud (`bible-tts` edge function → Lovable AI speech, WAV → MP3 in `aiVoice/encoder.worker.ts`) by default on phones/low-memory devices; the ~290 MB on-device model froze phones. On-device stays an opt-in and auto-falls back to cloud on failure.
- Next/previous chapter logic lives in `services/audioBible/nextChapter.ts` (fuzzy book-name matching, tested); the player prefetches the next chapter's playable link so auto-advance starts with no awaits (phones block delayed background play).
