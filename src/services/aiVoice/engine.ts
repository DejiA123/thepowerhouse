/**
 * The AI voice, from the app's side: is it on this device, downloading it,
 * which voice reads, and asking the background worker for speech.
 */
import { useEffect, useState } from 'react';
import { AI_VOICES, DEFAULT_VOICE, MODEL_CACHE, MODEL_FILES, totalDownloadBytes } from './model';
import { cloudDrop, cloudEnd, cloudSynth } from './cloudVoice';

export type AiVoiceStatus = 'missing' | 'downloading' | 'ready' | 'error';

const READY_KEY = 'ai_voice_ready_v1';
/** Has listened with the AI voice before (then it's got ready ahead of time) */
const USED_KEY = 'ai_voice_used_v1';
const VOICE_KEY = 'ai_voice_id';
const MODE_KEY = 'ai_voice_mode_v1';
const CHANGE = 'ai-voice:changed';

export interface SynthResult {
  mp3: Uint8Array;
  /** Length of the piece including the pause after it */
  seconds: number;
  speechSeconds: number;
  genSeconds: number;
  ep: 'webgpu' | 'wasm';
}

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
};

/** Phones (and low-memory devices) can't hold the on-device voice model: they use the cloud voice */
export function isPhoneLike() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iPadOS = navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1;
  const memory = (navigator as any).deviceMemory as number | undefined;
  return /iPhone|iPad|iPod|Android|Mobile/i.test(ua) || iPadOS || (memory !== undefined && memory <= 4);
}

export type AiVoiceMode = 'cloud' | 'device';

class AiVoiceEngine {
  private deviceStatus: AiVoiceStatus = read(READY_KEY) === '1' ? 'ready' : 'missing';
  /** Switched to the cloud for this session after the on-device voice failed */
  private fellBack = false;

  /** Where the voice is made: chosen in settings, otherwise cloud on phones */
  get mode(): AiVoiceMode {
    if (this.fellBack) return 'cloud';
    const saved = read(MODE_KEY);
    if (saved === 'cloud' || saved === 'device') return saved;
    return isPhoneLike() ? 'cloud' : 'device';
  }

  setMode(mode: AiVoiceMode) {
    write(MODE_KEY, mode);
    this.fellBack = false;
    this.emit();
  }

  /** The cloud voice is always ready; the on-device one must be downloaded */
  get status(): AiVoiceStatus {
    return this.mode === 'cloud' ? 'ready' : this.deviceStatus;
  }
  set status(s: AiVoiceStatus) {
    this.deviceStatus = s;
  }
  /** Whether the on-device voice is downloaded (for settings) */
  get deviceVoiceStatus() {
    return this.deviceStatus;
  }
  /** 0–1 while downloading */
  progress = 0;
  error: string | null = null;
  /** Where the voice runs: the graphics chip (fast) or the processor */
  device: 'webgpu' | 'wasm' | null = null;

  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void; onProgress?: (n: number) => void }>();
  private downloading: Promise<void> | null = null;
  private loaded: Promise<void> | null = null;

  get voice(): string {
    const saved = read(VOICE_KEY);
    return saved && AI_VOICES.some((v) => v.id === saved) ? saved : DEFAULT_VOICE;
  }

  setVoice(id: string) {
    if (!AI_VOICES.some((v) => v.id === id)) return;
    write(VOICE_KEY, id);
    this.emit();
    // Fetch the new voice now so it's there offline too
    if (this.status === 'ready' && navigator.onLine !== false) this.call({ type: 'load', voice: id }).catch(() => undefined);
  }

  get totalBytes() {
    return totalDownloadBytes();
  }

  private emit() {
    window.dispatchEvent(new CustomEvent(CHANGE));
  }

  private getWorker() {
    if (!this.worker) {
      this.worker = new Worker(new URL('./voice.worker.ts', import.meta.url), { type: 'module', name: 'ai-voice' });
      this.worker.onmessage = (event) => {
        const { id, ok, result, error, progress } = event.data || {};
        const entry = this.pending.get(id);
        if (!entry) return;
        if (typeof progress === 'number') {
          entry.onProgress?.(progress);
          return;
        }
        this.pending.delete(id);
        if (ok) entry.resolve(result);
        else entry.reject(new Error(error || 'AI voice error'));
      };
      this.worker.onerror = (event) => {
        console.error('[ai-voice] worker error', event);
        const error = new Error('The AI voice stopped working');
        this.pending.forEach((p) => p.reject(error));
        this.pending.clear();
        this.worker?.terminate();
        this.worker = null;
        this.loaded = null;
      };
    }
    return this.worker;
  }

  private call<T>(msg: Record<string, unknown>, onProgress?: (n: number) => void): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve, reject, onProgress });
      this.getWorker().postMessage({ ...msg, id });
    });
  }

  /** Checks what's really on the device (the browser can clear storage). */
  async refresh() {
    if (this.status === 'downloading') return this.status;
    try {
      // Read here rather than in the worker, so the voice isn't started just to look
      const cache = await caches.open(MODEL_CACHE);
      const hits = await Promise.all(MODEL_FILES.map((f) => cache.match(f.url)));
      const ready = hits.every(Boolean);
      this.status = ready ? 'ready' : 'missing';
      write(READY_KEY, ready ? '1' : null);
    } catch {
      /* keep what we had */
    }
    this.emit();
    return this.status;
  }

  /** Downloads the voice (once). Safe to call again while it runs. */
  download(): Promise<void> {
    if (this.downloading) return this.downloading;
    this.status = 'downloading';
    this.progress = 0;
    this.error = null;
    this.emit();
    const total = this.totalBytes;
    let lastEmit = 0;
    this.downloading = (async () => {
      try {
        try {
          if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
        } catch {
          /* not supported */
        }
        const st = await this.call<{ ready: boolean }>({ type: 'download', voice: this.voice }, (loaded) => {
          this.progress = Math.min(0.99, loaded / total);
          const now = Date.now();
          if (now - lastEmit > 250) {
            lastEmit = now;
            this.emit();
          }
        });
        if (!st.ready) throw new Error('The download did not finish');
        this.status = 'ready';
        this.progress = 1;
        write(READY_KEY, '1');
      } catch (error) {
        const quota = /quota|space/i.test((error as Error).message);
        this.status = 'error';
        this.error = quota
          ? 'Your device is out of space. Free up some space and try again.'
          : navigator.onLine === false
            ? "You're offline. Connect to the internet to download the voice."
            : 'The download stopped. Check your connection and try again.';
        throw error;
      } finally {
        this.downloading = null;
        this.emit();
      }
    })();
    return this.downloading;
  }

  /** Gets the voice ready to speak (loads it into memory). */
  load(): Promise<void> {
    if (!this.loaded) {
      this.loaded = this.call<{ ep: 'webgpu' | 'wasm' }>({ type: 'load', voice: this.voice })
        .then((r) => {
          this.device = r.ep;
          this.emit();
        })
        .catch((error) => {
          this.loaded = null;
          throw error;
        });
    }
    return this.loaded;
  }

  async synth(job: string, text: string, pause: number, voice = this.voice): Promise<SynthResult> {
    await this.load();
    write(USED_KEY, '1');
    return this.call<SynthResult>({ type: 'synth', job, text, voice, speed: 0.95, pause });
  }

  /**
   * Someone who listens with the AI voice opened a chapter it reads: get the
   * voice into memory now (it takes a while), so Listen starts sooner.
   */
  warmUp() {
    if (this.status !== 'ready' || this.loaded || read(USED_KEY) !== '1') return;
    const start = () => this.load().catch(() => undefined);
    const idle = (window as any).requestIdleCallback as ((cb: () => void, o?: { timeout: number }) => void) | undefined;
    if (idle) idle(start, { timeout: 4000 });
    else setTimeout(start, 2000);
  }

  async end(job: string): Promise<Uint8Array> {
    const r = await this.call<{ mp3: Uint8Array }>({ type: 'end', job });
    return r.mp3;
  }

  drop(job: string) {
    if (this.worker) this.call({ type: 'drop', job }).catch(() => undefined);
  }

  /** This device can't keep up: trade a little quality for speed. */
  slower() {
    this.call({ type: 'slower' }).catch(() => undefined);
  }

  async remove() {
    await this.call({ type: 'remove' }).catch(() => undefined);
    this.worker?.terminate();
    this.worker = null;
    this.loaded = null;
    this.status = 'missing';
    this.progress = 0;
    write(READY_KEY, null);
    this.emit();
  }
}

export const aiVoice = new AiVoiceEngine();

/** Re-renders when anything about the AI voice changes. */
export function useAiVoice() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener(CHANGE, bump);
    return () => window.removeEventListener(CHANGE, bump);
  }, []);
  return aiVoice;
}
