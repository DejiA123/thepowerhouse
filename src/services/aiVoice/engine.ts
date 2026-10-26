/**
 * The voice that reads the translations without a narrator ("non-narrated"),
 * from the app's side: which voice reads, and asking for speech piece by
 * piece. It's made online (see cloudVoice), the same on every phone; chapters
 * heard (or saved for offline) are kept on the device.
 */
import { useEffect, useState } from 'react';
import { AI_VOICES, DEFAULT_VOICE } from './voices';
import { CLOUD_AHEAD, cloudDrop, cloudEnd, cloudPrefetch, cloudSynth } from './cloudVoice';

const VOICE_KEY = 'ai_voice_id';
const CHANGE = 'ai-voice:changed';

export interface SynthResult {
  mp3: Uint8Array;
  /** Length of the piece including the pause after it */
  seconds: number;
  speechSeconds: number;
  genSeconds: number;
}

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

class VoiceEngine {
  /** Where the voice is made (kept in the address of each chapter it has read) */
  readonly mode = 'cloud' as const;
  /** Always ready: there's nothing to download */
  readonly status = 'ready' as const;

  get voice(): string {
    const saved = read(VOICE_KEY);
    return saved && AI_VOICES.some((v) => v.id === saved) ? saved : DEFAULT_VOICE;
  }

  setVoice(id: string) {
    if (!AI_VOICES.some((v) => v.id === id)) return;
    try {
      localStorage.setItem(VOICE_KEY, id);
    } catch {
      /* not remembered */
    }
    window.dispatchEvent(new CustomEvent(CHANGE));
  }

  /** Nothing to get ready before reading a chapter */
  async ready(): Promise<void> {}

  /** How many pieces are made at once */
  get piecesAhead() {
    return CLOUD_AHEAD;
  }

  /** Starts making a later piece of the chapter now. */
  prefetch(job: string, text: string, voice = this.voice) {
    cloudPrefetch(job, text, voice);
  }

  synth(job: string, text: string, pause: number, voice = this.voice): Promise<SynthResult> {
    return cloudSynth(job, text, pause, voice);
  }

  end(job: string): Promise<Uint8Array> {
    return cloudEnd(job);
  }

  drop(job: string) {
    cloudDrop(job);
  }
}

export const aiVoice = new VoiceEngine();

/** Re-renders when the choice of voice changes. */
export function useAiVoice() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener(CHANGE, bump);
    return () => window.removeEventListener(CHANGE, bump);
  }, []);
  return aiVoice;
}
