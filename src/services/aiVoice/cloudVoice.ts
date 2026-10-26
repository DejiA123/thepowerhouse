/**
 * The cloud voice: the same chapters read by Lovable AI instead of a voice
 * model on the phone (which is too big for many phones and froze them).
 * Each piece comes back as speech and is turned into MP3 in a small helper.
 *
 * Pieces are asked for a few at a time ahead of where the chapter is up to
 * (each takes several seconds to make), and joined in order, so a chapter is
 * ready several times faster than it takes to listen to.
 */
import { supabase } from '@/integrations/supabase/client';
import type { SynthResult } from './engine';

/** App voice → cloud voice of the same kind (male / female) */
const CLOUD_VOICE: Record<string, string> = {
  M1: 'Charon', M2: 'Orus', M3: 'Iapetus', M4: 'Fenrir', M5: 'Puck',
  F1: 'Kore', F2: 'Aoede', F3: 'Leda', F4: 'Zephyr', F5: 'Callirrhoe',
};

/** How many pieces are made at once */
export const CLOUD_AHEAD = 4;

/**
 * The app's own backend (the same one the rest of the app uses). Not from the
 * build settings: builds made outside Lovable (Vercel) don't have them, and
 * the voice then called an address that doesn't exist.
 */
const backend = supabase as unknown as { functionsUrl?: URL; supabaseKey?: string };
const FUNCTIONS_URL = backend.functionsUrl?.href ?? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON_KEY = backend.supabaseKey ?? (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string);

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();

function call<T>(msg: Record<string, unknown>, transfer: Transferable[] = []): Promise<T> {
  if (!worker) {
    worker = new Worker(new URL('./encoder.worker.ts', import.meta.url), { type: 'module', name: 'ai-voice-encoder' });
    worker.onmessage = (e) => {
      const p = pending.get(e.data?.id);
      if (!p) return;
      pending.delete(e.data.id);
      if (e.data.ok) p.resolve(e.data.result);
      else p.reject(new Error(e.data.error));
    };
    // The helper couldn't load (or stopped): fail now rather than wait forever, and start afresh next time
    worker.onerror = (event) => {
      console.error('[ai-voice] MP3 helper stopped', event);
      const error = new Error('The voice could not be prepared');
      pending.forEach((p) => p.reject(error));
      pending.clear();
      worker?.terminate();
      worker = null;
    };
  }
  const id = nextId++;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker!.postMessage({ ...msg, id }, transfer);
  });
}

/** Reads a WAV file's 16-bit PCM as numbers from -1 to 1 */
export function parseWav(buf: ArrayBuffer): { pcm: Float32Array; sampleRate: number } {
  const view = new DataView(buf);
  let sampleRate = 24000;
  let channels = 1;
  let offset = 12;
  if (view.byteLength < 12 || view.getUint32(0, false) !== 0x52494646) {
    // Raw PCM (no header)
    const n = Math.floor(buf.byteLength / 2);
    const pcm = new Float32Array(n);
    for (let i = 0; i < n; i++) pcm[i] = view.getInt16(i * 2, true) / 32768;
    return { pcm, sampleRate };
  }
  while (offset + 8 <= view.byteLength) {
    const id = view.getUint32(offset, false);
    let size = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (id === 0x666d7420) {
      channels = view.getUint16(start + 2, true);
      sampleRate = view.getUint32(start + 4, true);
    } else if (id === 0x64617461) {
      if (size === 0 || size === 0xffffffff || start + size > view.byteLength) size = view.byteLength - start;
      const frames = Math.floor(size / 2 / channels);
      const pcm = new Float32Array(frames);
      for (let i = 0; i < frames; i++) pcm[i] = view.getInt16(start + i * 2 * channels, true) / 32768;
      return { pcm, sampleRate };
    }
    offset = start + size + (size % 2);
  }
  throw new Error('The voice sent something unreadable');
}

/**
 * A piece normally takes 2–8 seconds: one that hangs is asked for again,
 * waiting a little longer each time (and longer for long pieces).
 */
const pieceTimeout = (text: string, attempt: number) => (15_000 + 30 * text.length) * attempt;

async function speak(text: string, voice: string): Promise<ArrayBuffer> {
  const { data: { session } } = await supabase.auth.getSession();
  for (let attempt = 1; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), pieceTimeout(text, attempt));
    try {
      const res = await fetch(`${FUNCTIONS_URL}/bible-tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${session?.access_token ?? ANON_KEY}` },
        body: JSON.stringify({ text, voice: CLOUD_VOICE[voice] ?? 'Charon' }),
        signal: controller.signal,
      });
      const audio = res.ok && /audio|octet-stream/i.test(res.headers.get('Content-Type') || '');
      if (audio) return await res.arrayBuffer();
      const retry = (res.status === 429 || res.status >= 500) && attempt < 3;
      if (!retry) {
        const msg = await res.json().then((j) => j?.error).catch(() => null);
        throw new Error(msg || `The cloud voice failed (${res.status})`);
      }
    } catch (error) {
      // Timed out, or the connection dropped: try again (a few times)
      const timedOut = (error as Error)?.name === 'AbortError';
      if (!(timedOut || error instanceof TypeError) || attempt >= 3 || navigator.onLine === false) throw error;
      // Timed out: it has waited long enough already, so ask again straight away
      if (timedOut) continue;
    } finally {
      clearTimeout(timer);
    }
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt + Math.random() * 500));
  }
}

/** Speech asked for ahead of time, by chapter and piece */
const ahead = new Map<string, Promise<{ pcm: Float32Array; sampleRate: number }>>();
const aheadKey = (job: string, text: string, voice: string) => `${job}|${voice}|${text}`;

/** Starts making a piece now, so it's ready by the time the chapter gets to it. */
export function cloudPrefetch(job: string, text: string, voice: string) {
  const key = aheadKey(job, text, voice);
  if (ahead.has(key)) return;
  const made = speak(text, voice).then(parseWav);
  made.catch(() => undefined); // reported when the chapter gets to it
  ahead.set(key, made);
}

export async function cloudSynth(job: string, text: string, pause: number, voice: string): Promise<SynthResult> {
  const started = performance.now();
  const key = aheadKey(job, text, voice);
  const made = ahead.get(key) ?? speak(text, voice).then(parseWav);
  ahead.delete(key);
  const { pcm: speech, sampleRate } = await made;
  const silence = Math.floor(pause * sampleRate);
  const pcm = new Float32Array(speech.length + silence);
  pcm.set(speech);
  const mp3 = await call<Uint8Array>({ type: 'encode', job, pcm, sampleRate }, [pcm.buffer]);
  return {
    mp3,
    seconds: (speech.length + silence) / sampleRate,
    speechSeconds: speech.length / sampleRate,
    genSeconds: (performance.now() - started) / 1000,
  };
}

export const cloudEnd = (job: string) => call<Uint8Array>({ type: 'end', job });
export const cloudDrop = (job: string) => {
  for (const key of ahead.keys()) if (key.startsWith(`${job}|`)) ahead.delete(key);
  if (worker) call({ type: 'drop', job }).catch(() => undefined);
};
