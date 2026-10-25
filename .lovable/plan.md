# Fix the NASB AI voice on phones ("The AI voice couldn't read this chapter")

## What's wrong
On phones the app is meant to read NASB with the online voice. The online voice service itself works: a test request just now returned speech. Your phone never got as far as asking it, though. Before reading, the app still tries to start the big on-device voice, which isn't on the phone. That step fails, so the chapter stops with "The AI voice couldn't read this chapter". On a phone where it does start, it can also freeze the phone, which is the problem we were trying to remove.

## The fix
1. When the online voice is in use, skip the on-device voice completely. Nothing large is loaded and nothing is downloaded.
2. If the on-device voice fails for any reason, carry on with the online voice. Don't stop the chapter.
3. When reading fails, say why ("You're offline", "AI credits have run out", "Too many requests, wait a moment") instead of only "please try again".
4. The next chapter (and the jump to the next book) gets the same fix, so NASB keeps playing on from one chapter to the next.

## Checks
- In a phone-sized test browser, play NASB Ephesians 1 with the AI voice. Confirm it starts within a few seconds, highlights the verses and has no error.
- Let it run to the end of the chapter and confirm Ephesians 2 starts by itself.
- Add a small test: with the online voice, getting a chapter ready never starts the on-device voice.

## After the fix
Publish again, then fully close and reopen the app on your iPhone so it picks up the new version.

## Technical details
- `chapterAudio.ts` `prepare()` always runs `await aiVoice.load()`, and that posts `load` to `voice.worker.ts` (the on-device model). In cloud mode, load fails because the model isn't there, and prepare throws.
- `engine.ts`: make `load()` resolve straight away when `mode === 'cloud'`. In `prepare()`, call load only in device mode. If load fails, switch to cloud (`fellBack`) instead of throwing.
- `GlobalAudioContext.tsx`: map the cloud error messages (402/429/offline) into the alert text.
- Check `bible-tts` logs during the test to confirm requests arrive.
