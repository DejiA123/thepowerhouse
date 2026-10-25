# Fix next-chapter auto-play and the AI voice on phones

## What's wrong
1. **Next chapter doesn't always start.** When a chapter ends, the app waits to look up the next chapter's audio before playing it. Phones (especially iPhones with the screen locked) only allow a new chapter to start if it starts immediately; any delay and the phone blocks it, so playback just stops.
2. **AI voice (NASB and other versions without a recorded narrator) freezes and crashes on phones.** The voice is generated on the phone itself using a roughly 290 MB voice model. Phones, older iPhones in particular, run out of memory and the app freezes or reloads.

## The fix

### 1. Reliable next chapter
- Always have the next chapter ready before the current one ends (recorded audio address, or the AI voice's finished audio) about 30 seconds before the end.
- When a chapter ends, switch to the next one instantly on the same player, with no waiting, so the phone keeps playing even when locked.
- If the next chapter wasn't ready in time, show "Preparing next chapter..." and start it as soon as it's ready, instead of silently stopping.
- Turn off the double-trigger (the safety retry plus the background helper) that sometimes skipped a chapter or stopped playback.
- Keep the lock-screen next/previous buttons, Loop Chapter and Loop Book working the same way.

### 2. AI voice that works on every phone
- On phones, read NASB (and other versions without a recorded narrator) with a cloud voice: natural speech, nothing to download, no strain on the phone.
- Read each chapter in short pieces so listening starts within a couple of seconds, and save the finished chapter on the phone so replaying it or listening offline costs nothing.
- Computers with plenty of power keep the current on-device voice. Anyone who already downloaded it can still choose it in settings.
- If the on-device voice fails or the phone is low on memory, switch to the cloud voice automatically instead of freezing.
- Voice choice (male/female) carries over to the cloud voice.

### Cost note
The cloud voice uses Lovable AI credits each time a new chapter is read aloud for the first time. Saved chapters are free to replay.

## Checks
- Test a full chapter ending and moving on to the next, including the jump from the last chapter of a book to the next book, Loop Chapter and Loop Book.
- Test NASB with the AI voice on a phone-sized screen: it starts quickly, moves to the next chapter, and nothing freezes.
- Add small tests for the next-chapter rules (end of book, Loop Book, end of Bible).

## Technical details
- `GlobalAudioContext.tsx`: prefetch next-chapter source near the end (timeupdate), set `audio.src` + `play()` synchronously inside `ended`; remove the 5 s retry timer and SW `AUDIO_ENDED` double-path; extract next-chapter computation into a pure function with tests.
- New Edge Function `bible-tts` calling Lovable AI `/v1/audio/speech` (default TTS model), streaming per chunk; client assembles chunks via `chapterAudio.ts` and caches the result in Cache Storage.
- `engine.ts`: device check (mobile UA / `deviceMemory` / iOS) chooses cloud by default on phones; on worker error or OOM, fall back to cloud.
- Keep Vite `es2020` build target.
