/// <reference lib="webworker" />
/**
 * The AI voice at work, away from the screen so the app stays smooth: turns
 * Bible text into speech with Supertonic 2 (on the graphics chip when the
 * phone has WebGPU, otherwise on the processor) and into MP3 for the player.
 */
import * as ort from 'onnxruntime-web/webgpu';
import runtimeUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url';
import { createMp3Encoder } from 'wasm-media-encoders';
import { MODEL_CACHE, MODEL_FILES, voiceStyleUrl } from './model';

const ctx = self as unknown as DedicatedWorkerGlobalScope;
type Encoder = Awaited<ReturnType<typeof createMp3Encoder>>;

ort.env.wasm.numThreads = 1; // several threads need a cross-origin isolated page
ort.env.logLevel = 'error';

const RUNTIME_KEY = new URL(runtimeUrl, ctx.location.href).href;

/* ── Model files on the device ───────────────────────────────────────── */

async function fileStatus() {
  const cache = await caches.open(MODEL_CACHE);
  const urls = [...MODEL_FILES.map((f) => f.url), RUNTIME_KEY];
  const hits = await Promise.all(urls.map((u) => cache.match(u)));
  return { ready: hits.every(Boolean), saved: hits.filter(Boolean).length, total: urls.length };
}

/** Saves one file into the cache as it arrives, reporting bytes as they come in. */
async function saveFile(cache: Cache, url: string, onBytes: (n: number) => void) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    let counted = 0;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok || !res.body) throw new Error(`Download failed (${res.status})`);
      const counter = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          counted += chunk.byteLength;
          onBytes(chunk.byteLength);
          controller.enqueue(chunk);
        },
      });
      const type = res.headers.get('Content-Type') || 'application/octet-stream';
      await cache.put(url, new Response(res.body.pipeThrough(counter), { headers: { 'Content-Type': type } }));
      return;
    } catch (error) {
      lastError = error;
      onBytes(-counted); // that part starts again
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  throw lastError;
}

async function download(voice: string, onProgress: (loaded: number) => void) {
  const cache = await caches.open(MODEL_CACHE);
  let loaded = 0;
  const bump = (n: number) => {
    loaded += n;
    onProgress(loaded);
  };
  const files = [
    ...MODEL_FILES.map((f) => ({ url: f.url, bytes: f.bytes })),
    { url: RUNTIME_KEY, bytes: 0 },
    { url: voiceStyleUrl(voice), bytes: 0 },
  ];
  for (const file of files) {
    if (await cache.match(file.url)) {
      bump(file.bytes);
      continue;
    }
    await saveFile(cache, file.url, bump);
  }
}

async function readFile(url: string): Promise<ArrayBuffer> {
  const cache = await caches.open(MODEL_CACHE);
  let hit = await cache.match(url);
  if (!hit) {
    // Voice styles are small: fetched the first time each voice is used
    await saveFile(cache, url, () => undefined);
    hit = await cache.match(url);
  }
  if (!hit) throw new Error('Voice file missing');
  return hit.arrayBuffer();
}

/* ── Speech ──────────────────────────────────────────────────────────── */

interface Config {
  sampleRate: number;
  chunk: number;
  latentDim: number;
}

let engine: {
  dp: ort.InferenceSession;
  enc: ort.InferenceSession;
  ve: ort.InferenceSession;
  voc: ort.InferenceSession;
  cfg: Config;
  indexer: number[];
  ep: 'webgpu' | 'wasm';
} | null = null;
let loading: Promise<NonNullable<typeof engine>> | null = null;
/** Quality steps: more sound better, fewer are quicker (chosen from the device's speed) */
let steps = 5;

async function hasWebGpu() {
  try {
    const gpu = (navigator as any).gpu;
    return !!gpu && !!(await gpu.requestAdapter());
  } catch {
    return false;
  }
}

async function createSessions(ep: 'webgpu' | 'wasm') {
  const options: ort.InferenceSession.SessionOptions = { executionProviders: [ep], graphOptimizationLevel: 'all' };
  const open = async (name: string) => {
    const file = MODEL_FILES.find((f) => f.name === name)!;
    return ort.InferenceSession.create(new Uint8Array(await readFile(file.url)), options);
  };
  // One at a time keeps the memory needed while loading down
  const dp = await open('duration_predictor.onnx');
  const enc = await open('text_encoder.onnx');
  const ve = await open('vector_estimator.onnx');
  const voc = await open('vocoder.onnx');
  return { dp, enc, ve, voc };
}

async function load(forceWasm = false) {
  if (engine && !(forceWasm && engine.ep === 'webgpu')) return engine;
  if (loading && !forceWasm) return loading;
  loading = (async () => {
    if (!ort.env.wasm.wasmBinary) ort.env.wasm.wasmBinary = await readFile(RUNTIME_KEY);
    const tts = JSON.parse(new TextDecoder().decode(await readFile(MODEL_FILES[0].url)));
    const indexer = JSON.parse(new TextDecoder().decode(await readFile(MODEL_FILES[1].url)));
    const cfg: Config = {
      sampleRate: tts.ae.sample_rate,
      chunk: tts.ae.base_chunk_size * tts.ttl.chunk_compress_factor,
      latentDim: tts.ttl.latent_dim * tts.ttl.chunk_compress_factor,
    };
    let ep: 'webgpu' | 'wasm' = !forceWasm && (await hasWebGpu()) ? 'webgpu' : 'wasm';
    let sessions;
    try {
      sessions = await createSessions(ep);
    } catch (error) {
      if (ep !== 'webgpu') throw error;
      console.warn('[ai-voice] graphics chip not usable, using the processor', error);
      ep = 'wasm';
      sessions = await createSessions(ep);
    }
    // HD on the graphics chip: 10 steps sound clearly more natural (measured with
    // UTMOS: 4.50 against 4.20 at 5) and cost little there. On the processor the
    // sound-making step dominates, so fewer steps keep it ahead of the listener.
    steps = ep === 'webgpu' ? 10 : 2;
    engine = { ...sessions, cfg, indexer, ep };
    return engine;
  })();
  try {
    return await loading;
  } finally {
    loading = null;
  }
}

const styles = new Map<string, { ttl: ort.Tensor; dp: ort.Tensor; gain: number }>();

async function styleFor(voice: string) {
  const known = styles.get(voice);
  if (known) return known;
  const json = JSON.parse(new TextDecoder().decode(await readFile(voiceStyleUrl(voice))));
  const tensor = (part: { dims: number[]; data: unknown[] }) =>
    new ort.Tensor('float32', Float32Array.from((part.data as any).flat(Infinity) as number[]), part.dims);
  const style = { ttl: tensor(json.style_ttl), dp: tensor(json.style_dp), gain: 1 };
  styles.set(voice, style);
  // Warm up (the graphics chip prepares itself on first use) and set the
  // voice's loudness from a typical sentence, so every chapter and every voice
  // is as loud as the narrated recordings
  const sample = await infer('In the beginning God created the heavens and the earth, and the Spirit of God moved upon the waters.', style, 1);
  const level = speechLevel(sample, engine?.cfg.sampleRate ?? 44100);
  style.gain = level > 0 ? Math.min(6, Math.max(0.7, SPEECH_LEVEL / level)) : 2.5;
  return style;
}

/** Target loudness of speech (RMS of the spoken parts, about -15 LUFS like the recordings) */
const SPEECH_LEVEL = 0.2;

/** How loud the speech is, leaving out pauses (gated like a loudness meter) */
function speechLevel(pcm: Float32Array, sampleRate: number) {
  const frame = Math.max(1, Math.floor(sampleRate * 0.02));
  const powers: number[] = [];
  for (let start = 0; start + frame <= pcm.length; start += frame) {
    let sum = 0;
    for (let i = start; i < start + frame; i++) sum += pcm[i] * pcm[i];
    powers.push(sum / frame);
  }
  if (!powers.length) return 0;
  const loudest = Math.max(...powers);
  const spoken = powers.filter((p) => p > loudest / 1000); // within 30 dB of the loudest
  return Math.sqrt(spoken.reduce((a, b) => a + b, 0) / spoken.length);
}

const REPLACEMENTS: [RegExp, string][] = [
  [/‑/g, '-'],
  [/\s*(?:[–—]|--+)\s*/g, ', '],
  [/_/g, ' '],
  [/[“”„«»]/g, '"'],
  [/[‘’´`]/g, "'"],
  [/[[\]|\/#→←{}<>*†‡¶§]/g, ' '],
  [/[♥☆♡©\\]/g, ''],
  [/@/g, ' at '],
  [/…/g, '...'],
];

function prepareText(raw: string, indexer: number[]) {
  let text = raw.normalize('NFKD').replace(/[̀-ͯ]/g, '');
  for (const [pattern, to] of REPLACEMENTS) text = text.replace(pattern, to);
  text = text
    .replace(/ ([,.!?;:'])/g, '$1')
    .replace(/(["'])\1+/g, '$1')
    .replace(/,\s*,/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
  if (!/[.!?;:,'")\]}]$/.test(text)) text += '.';
  // Only characters the voice knows
  let kept = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp < indexer.length && indexer[cp] >= 0) kept += ch;
  }
  return `<en>${kept}</en>`;
}

function randn(n: number) {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 2) {
    const u1 = Math.max(1e-7, Math.random());
    const u2 = Math.random();
    const r = Math.sqrt(-2 * Math.log(u1));
    out[i] = r * Math.cos(2 * Math.PI * u2);
    if (i + 1 < n) out[i + 1] = r * Math.sin(2 * Math.PI * u2);
  }
  return out;
}

async function infer(text: string, style: { ttl: ort.Tensor; dp: ort.Tensor }, speed: number): Promise<Float32Array> {
  const e = await load();
  const prepared = prepareText(text, e.indexer);
  const ids = new BigInt64Array(prepared.length);
  for (let j = 0; j < prepared.length; j++) {
    const cp = prepared.codePointAt(j)!;
    ids[j] = BigInt(cp < e.indexer.length ? e.indexer[cp] : 0);
  }
  const textIds = new ort.Tensor('int64', ids, [1, ids.length]);
  const textMask = new ort.Tensor('float32', new Float32Array(ids.length).fill(1), [1, 1, ids.length]);

  const { duration } = await e.dp.run({ text_ids: textIds, style_dp: style.dp, text_mask: textMask });
  const seconds = (duration.data as Float32Array)[0] / speed;
  const { text_emb: textEmb } = await e.enc.run({ text_ids: textIds, style_ttl: style.ttl, text_mask: textMask });

  const samples = Math.max(1, Math.floor(seconds * e.cfg.sampleRate));
  const frames = Math.max(1, Math.ceil(samples / e.cfg.chunk));
  let latent = randn(e.cfg.latentDim * frames);
  const latentMask = new ort.Tensor('float32', new Float32Array(frames).fill(1), [1, 1, frames]);
  const total = new ort.Tensor('float32', new Float32Array([steps]), [1]);
  for (let step = 0; step < steps; step++) {
    const out = await e.ve.run({
      noisy_latent: new ort.Tensor('float32', latent, [1, e.cfg.latentDim, frames]),
      text_emb: textEmb,
      style_ttl: style.ttl,
      latent_mask: latentMask,
      text_mask: textMask,
      current_step: new ort.Tensor('float32', new Float32Array([step]), [1]),
      total_step: total,
    });
    latent = out.denoised_latent.data as Float32Array;
  }
  const { wav_tts: wav } = await e.voc.run({ latent: new ort.Tensor('float32', latent, [1, e.cfg.latentDim, frames]) });
  const data = wav.data as Float32Array;
  return data.slice(0, Math.min(samples, data.length));
}

/** Louder to a steady level, soft-limited, with tiny fades so joins never click. */
function finish(speech: Float32Array, gain: number, sampleRate: number) {
  const out = new Float32Array(speech.length);
  const knee = 0.8;
  const ceiling = 0.93;
  const fade = Math.min(Math.floor(sampleRate * 0.006), Math.floor(speech.length / 2));
  for (let i = 0; i < speech.length; i++) {
    let x = speech[i] * gain;
    const a = Math.abs(x);
    if (a > knee) x = Math.sign(x) * (knee + (ceiling - knee) * Math.tanh((a - knee) / (ceiling - knee)));
    if (i < fade) x *= i / fade;
    else if (i >= speech.length - fade) x *= (speech.length - 1 - i) / fade;
    out[i] = x;
  }
  return out;
}

/* ── MP3 for each chapter being made ─────────────────────────────────── */

const encoders = new Map<string, Encoder>();

async function encoderFor(job: string, sampleRate: number) {
  let encoder = encoders.get(job);
  if (!encoder) {
    encoder = await createMp3Encoder();
    encoder.configure({ sampleRate, channels: 1, bitrate: 64 });
    encoders.set(job, encoder);
  }
  return encoder;
}

async function synth(job: string, text: string, voice: string, speed: number, pause: number) {
  const started = performance.now();
  let style;
  let speech;
  try {
    style = await styleFor(voice);
    speech = await infer(text, style, speed);
  } catch (error) {
    if (engine?.ep !== 'webgpu') throw error;
    // The graphics chip gave up (it can be taken away from apps): carry on with the processor
    console.warn('[ai-voice] switching to the processor', error);
    engine = null;
    styles.clear();
    await load(true);
    style = await styleFor(voice);
    speech = await infer(text, style, speed);
  }
  const e = await load();
  const sr = e.cfg.sampleRate;
  const body = finish(speech, style.gain, sr);
  const silence = Math.floor(pause * sr);
  const pcm = new Float32Array(body.length + silence);
  pcm.set(body);
  const encoder = await encoderFor(job, sr);
  const mp3 = encoder.encode([pcm]).slice();
  return {
    mp3,
    seconds: pcm.length / sr,
    speechSeconds: body.length / sr,
    genSeconds: (performance.now() - started) / 1000,
    ep: e.ep,
  };
}

/* ── Messages from the app ───────────────────────────────────────────── */

type Request =
  | { id: number; type: 'status' }
  | { id: number; type: 'download'; voice: string }
  | { id: number; type: 'load'; voice: string }
  | { id: number; type: 'synth'; job: string; text: string; voice: string; speed: number; pause: number }
  | { id: number; type: 'end'; job: string }
  | { id: number; type: 'drop'; job: string }
  | { id: number; type: 'slower' }
  | { id: number; type: 'remove' };

async function handle(msg: Request): Promise<unknown> {
  switch (msg.type) {
    case 'status':
      return fileStatus();
    case 'download':
      await download(msg.voice, (loaded) => ctx.postMessage({ id: msg.id, progress: loaded }));
      return fileStatus();
    case 'load': {
      const e = await load();
      await styleFor(msg.voice);
      return { ep: e.ep, steps };
    }
    case 'synth': {
      const result = await synth(msg.job, msg.text, msg.voice, msg.speed, msg.pause);
      ctx.postMessage({ id: msg.id, ok: true, result }, [result.mp3.buffer]);
      return undefined;
    }
    case 'end': {
      const encoder = encoders.get(msg.job);
      encoders.delete(msg.job);
      return { mp3: encoder ? encoder.finalize().slice() : new Uint8Array(0) };
    }
    case 'drop':
      encoders.delete(msg.job);
      return null;
    case 'slower':
      // This device can't keep up: fewer steps from now on
      steps = Math.max(2, steps - 3);
      return { steps };
    case 'remove':
      engine = null;
      styles.clear();
      await caches.delete(MODEL_CACHE);
      return null;
  }
}

const run = async (msg: Request) => {
  try {
    const result = await handle(msg);
    if (msg.type !== 'synth') ctx.postMessage({ id: msg.id, ok: true, result });
  } catch (error) {
    ctx.postMessage({ id: msg.id, ok: false, error: (error as Error)?.message || String(error) });
  }
};

// One request at a time: the model can only do one thing at once.
// Checking what's saved, or letting go of a chapter, never waits in line.
let queue: Promise<unknown> = Promise.resolve();
ctx.onmessage = (event: MessageEvent<Request>) => {
  const msg = event.data;
  if (msg.type === 'status' || msg.type === 'drop') run(msg);
  else queue = queue.then(() => run(msg));
};
