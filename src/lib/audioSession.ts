/**
 * iOS audio session (Safari 16.4+). Telling iOS what kind of audio we play
 * makes lock-screen / Control Center play and pause behave like a music app:
 *  • "playback" for the audio Bible and choir tracks (keeps playing when locked)
 *  • "play-and-record" during calls (microphone + speaker)
 *  • "auto" lets Safari decide again
 */
export type AppAudioSession = 'auto' | 'playback' | 'play-and-record';

export function setAudioSession(type: AppAudioSession) {
  try {
    const session = (navigator as any).audioSession;
    if (session && session.type !== type) session.type = type;
  } catch {
    /* not supported */
  }
}
