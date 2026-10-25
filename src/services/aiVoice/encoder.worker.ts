/// <reference lib="webworker" />
/** Turns speech from the cloud voice into MP3 pieces (small; no voice model here). */
import { createMp3Encoder } from 'wasm-media-encoders';

type Encoder = Awaited<ReturnType<typeof createMp3Encoder>>;
const ctx = self as unknown as DedicatedWorkerGlobalScope;
const encoders = new Map<string, Encoder>();

ctx.onmessage = async (event) => {
  const { id, type, job, pcm, sampleRate } = event.data || {};
  try {
    if (type === 'encode') {
      let enc = encoders.get(job);
      if (!enc) {
        enc = await createMp3Encoder();
        enc.configure({ sampleRate, channels: 1, bitrate: 64 });
        encoders.set(job, enc);
      }
      const mp3 = enc.encode([pcm as Float32Array]).slice();
      ctx.postMessage({ id, ok: true, result: mp3 }, [mp3.buffer]);
    } else if (type === 'end') {
      const enc = encoders.get(job);
      encoders.delete(job);
      const mp3 = enc ? enc.finalize().slice() : new Uint8Array(0);
      ctx.postMessage({ id, ok: true, result: mp3 }, [mp3.buffer]);
    } else if (type === 'drop') {
      encoders.delete(job);
      ctx.postMessage({ id, ok: true, result: null });
    }
  } catch (error) {
    ctx.postMessage({ id, ok: false, error: (error as Error)?.message || String(error) });
  }
};
