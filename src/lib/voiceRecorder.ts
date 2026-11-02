/**
 * Recording a voice message, like WhatsApp: the microphone is turned into MP3
 * on the phone as it records (the same encoder as the read-aloud Bible), so
 * every phone can play it: iPhone and Android alike. MediaRecorder isn't used:
 * its formats differ between phones (Safari can't play Android's).
 */

export interface VoiceRecording {
  blob: Blob;
  seconds: number;
  /** 0–9 for each of 32 bars */
  bars: string;
}

const BARS = 32;
/** WhatsApp-style limit: 15 minutes */
export const MAX_VOICE_SECONDS = 15 * 60;

interface WorkerReply {
  id: number;
  ok: boolean;
  result?: Uint8Array | null;
  error?: string;
}

let worker: Worker | null = null;
let nextId = 1;
const waiting = new Map<number, (r: WorkerReply) => void>();

function encoder(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../services/aiVoice/encoder.worker.ts', import.meta.url), { type: 'module', name: 'voice-message-encoder' });
    worker.onmessage = (e: MessageEvent<WorkerReply>) => {
      waiting.get(e.data.id)?.(e.data);
      waiting.delete(e.data.id);
    };
  }
  return worker;
}

function ask(message: Record<string, unknown>, transfer: Transferable[] = []): Promise<Uint8Array | null> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    waiting.set(id, (r) => (r.ok ? resolve(r.result ?? null) : reject(new Error(r.error || 'Encoding failed'))));
    encoder().postMessage({ id, ...message }, transfer);
  });
}

export class VoiceRecorder {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private node: ScriptProcessorNode | null = null;
  private job = `voice-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  private parts: Promise<Uint8Array | null>[] = [];
  private levels: number[] = [];
  private samples = 0;
  private stopped = false;
  /** Called about 10 times a second with the seconds so far and the latest level (0–1) */
  onTick?: (seconds: number, level: number) => void;
  /** Reached the longest a voice message can be */
  onLimit?: () => void;

  /** Start recording. Call it straight from the tap (iPhone only lets sound start from a tap). */
  async start(): Promise<void> {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    void this.ctx.resume();
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    if (this.stopped) {
      this.release();
      throw new Error('cancelled');
    }
    const ctx = this.ctx;
    const source = ctx.createMediaStreamSource(this.stream);
    const node = ctx.createScriptProcessor(4096, 1, 1);
    const silent = ctx.createGain();
    silent.gain.value = 0;
    node.onaudioprocess = (e) => {
      if (this.stopped) return;
      const input = e.inputBuffer.getChannelData(0);
      const pcm = new Float32Array(input);
      let sum = 0;
      for (let i = 0; i < pcm.length; i++) sum += pcm[i] * pcm[i];
      const level = Math.min(1, Math.sqrt(sum / pcm.length) * 4);
      this.levels.push(level);
      this.samples += pcm.length;
      this.parts.push(ask({ type: 'encode', job: this.job, pcm, sampleRate: ctx.sampleRate }, [pcm.buffer]));
      const seconds = this.samples / ctx.sampleRate;
      this.onTick?.(seconds, level);
      if (seconds >= MAX_VOICE_SECONDS) this.onLimit?.();
    };
    source.connect(node);
    node.connect(silent);
    silent.connect(ctx.destination);
    this.node = node;
  }

  get seconds() {
    return this.ctx ? this.samples / this.ctx.sampleRate : 0;
  }

  /** Stop and get the MP3 (null if nothing was recorded) */
  async stop(): Promise<VoiceRecording | null> {
    if (this.stopped) return null;
    this.stopped = true;
    const seconds = this.seconds;
    this.release();
    const chunks = await Promise.all(this.parts);
    const tail = await ask({ type: 'end', job: this.job });
    const all = [...chunks, tail].filter((c): c is Uint8Array => !!c && c.length > 0);
    if (!all.length || seconds < 0.3) return null;
    return { blob: new Blob(all, { type: 'audio/mpeg' }), seconds, bars: this.waveform() };
  }

  /** Throw it away */
  cancel() {
    if (this.stopped) return;
    this.stopped = true;
    this.release();
    ask({ type: 'drop', job: this.job }).catch(() => undefined);
  }

  private waveform(): string {
    const levels = this.levels;
    if (!levels.length) return '';
    const peak = Math.max(...levels, 0.05);
    return Array.from({ length: BARS }, (_, i) => {
      const from = Math.floor((i * levels.length) / BARS);
      const to = Math.max(from + 1, Math.floor(((i + 1) * levels.length) / BARS));
      const slice = levels.slice(from, to);
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
      return String(Math.min(9, Math.round((avg / peak) * 9)));
    }).join('');
  }

  private release() {
    try {
      this.node?.disconnect();
    } catch {
      /* already */
    }
    this.node = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }
}
