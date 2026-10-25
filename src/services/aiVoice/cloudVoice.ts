/**
 * The cloud voice: the same chapters read by Lovable AI instead of a voice
 * model on the phone (which is too big for many phones and froze them).
 * Each piece comes back as speech and is turned into MP3 in a small helper.
 */
import { supabase } from '@/integrations/supabase/client';
import type { SynthResult } from './engine';

/** App voice → cloud voice of the same kind (male / female) */
const CLOUD_VOICE: Record<string, string> = {
  M1: 'Charon', M2: 'Orus', M3: 'Iapetus', M4: 'Fenrir', M5: 'Puck',
  F1: 'Kore', F2: 'Aoede', F3: 'Leda', F4: 'Zephyr', F5: 'Callirrhoe',
};

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

async function speak(text: string, voice: string): Promise<ArrayBuffer> {
  const { data: { session } } = await supabase.auth.getSession();
  const base = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${base}/functions/v1/bible-tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: anon, Authorization: `Bearer ${session?.access_token ?? anon}` },
      body: JSON.stringify({ text, voice: CLOUD_VOICE[voice] ?? 'Charon' }),
    });
    if (res.ok) return res.arrayBuffer();
    const retry = (res.status === 429 || res.status >= 500) && attempt < 3;
    if (!retry) {
      const msg = await res.json().then((j) => j?.error).catch(() => null);
      throw new Error(msg || `The cloud voice failed (${res.status})`);
    }
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt + Math.random() * 500));
  }
}

export async function cloudSynth(job: string, text: string, pause: number, voice: string): Promise<SynthResult> {
  const started = performance.now();
  const { pcm: speech, sampleRate } = parseWav(await speak(text, voice));
  const silence = Math.floor(pause * sampleRate);
  const pcm = new Float32Array(speech.length + silence);
  pcm.set(speech);
  const mp3 = await call<Uint8Array>({ type: 'encode', job, pcm, sampleRate }, [pcm.buffer]);
  return {
    mp3,
    seconds: (speech.length + silence) / sampleRate,
    speechSeconds: speech.length / sampleRate,
    genSeconds: (performance.now() - started) / 1000,
    ep: 'wasm',
  };
}

export const cloudEnd = (job: string) => call<Uint8Array>({ type: 'end', job });
export const cloudDrop = (job: string) => {
  if (worker) call({ type: 'drop', job }).catch(() => undefined);
};
