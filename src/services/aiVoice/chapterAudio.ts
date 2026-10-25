/**
 * Chapters read by the AI voice.
 *
 * A chapter is made piece by piece in the background worker and streamed to
 * the app's one audio player as it's made (MediaSource), so listening starts
 * within seconds, with the lock screen, seeking back and "next chapter" all
 * working as for recorded chapters. Playback only starts once enough is made
 * that this device can stay ahead to the end, so it never stops mid-chapter.
 * Finished chapters are kept on the device: playing them again is instant,
 * and the next chapter is made while this one plays.
 */
import { bibleBooks } from '@/components/bible/BibleBookList';
import { setLiveTimings, type VerseTimings } from '@/services/verseTimingService';
import { reportView } from '@/services/apiBible';
import { aiVoice } from './engine';
import { buildScript, looksLikeBibleText, type ScriptPart } from './script';

const AUDIO_CACHE = 'ai-voice-audio-v1';
const INDEX_KEY = 'ai_voice_audio_index_v1';
const SPEED_KEY = 'ai_voice_speed_v1';
const PACE_KEY = 'ai_voice_pace_v1';
const KEEP = 30;
/** Speaking pace before this device has measured it (characters a second) */
const DEFAULT_CHARS_PER_SECOND = 13.5;

const allBooks = [...bibleBooks['Old Testament'], ...bibleBooks['New Testament']];

export interface AiChapterRef {
  version: string;
  translation: string;
  book: string;
  chapter: number;
}

export interface PreparedChapter {
  /** What the audio player plays */
  src: string;
  /** For the verse highlighting (see verseTimingService) */
  timingId: string;
  key: string;
}

/** Fired as a chapter is made: { key, readiness, failed } */
export const AI_PROGRESS_EVENT = 'ai-voice:progress';

const keyFor = (voice: string, ref: AiChapterRef) =>
  `${self.location.origin}/__ai-voice__/${aiVoice.mode === 'cloud' ? 'cloud-' : ''}${voice}/${ref.translation}/${ref.book.toLowerCase()}/${ref.chapter}.mp3`;

export const isAiKey = (url: string) => url.includes('/__ai-voice__/');

/** Where the player is (to let go of audio already heard in very long chapters) */
let playerTime = () => 0;

/* ── Finished chapters kept on the device ───────────────────────────── */

const readIndex = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) || '[]');
  } catch {
    return [];
  }
};
const writeIndex = (keys: string[]) => {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(keys));
  } catch {
    /* storage unavailable */
  }
};

async function store(key: string, mp3: Blob, timings: VerseTimings) {
  try {
    const cache = await caches.open(AUDIO_CACHE);
    await cache.put(key, new Response(mp3, { headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': String(mp3.size) } }));
    await cache.put(`${key}.json`, new Response(JSON.stringify([...timings]), { headers: { 'Content-Type': 'application/json' } }));
    const keys = [key, ...readIndex().filter((k) => k !== key)];
    const old = keys.splice(KEEP);
    writeIndex(keys);
    await Promise.all(old.flatMap((k) => [cache.delete(k), cache.delete(`${k}.json`)]));
  } catch (error) {
    console.warn('[ai-voice] could not keep the chapter', error);
  }
}

async function fromDevice(key: string): Promise<{ blob: Blob; timings: VerseTimings } | null> {
  try {
    const cache = await caches.open(AUDIO_CACHE);
    const [audio, json] = await Promise.all([cache.match(key), cache.match(`${key}.json`)]);
    if (!audio) return null;
    const blob = await audio.blob();
    const timings: VerseTimings = new Map(json ? await json.json() : []);
    // Most recently played first, so it's kept the longest
    writeIndex([key, ...readIndex().filter((k) => k !== key)]);
    return { blob: blob.type ? blob : new Blob([blob], { type: 'audio/mpeg' }), timings };
  } catch {
    return null;
  }
}

/* ── How fast this device makes speech ──────────────────────────────── */

/** Seconds of speech made per second of work (above 1 = faster than listening) */
function knownSpeed(): number | null {
  try {
    const v = Number(localStorage.getItem(SPEED_KEY));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}
/** Seconds of speech per character for a voice, as last measured */
function knownPace(voice = aiVoice.voice): number | null {
  try {
    const v = Number(JSON.parse(localStorage.getItem(PACE_KEY) || '{}')[voice]);
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}
function rememberPace(v: number, voice: string) {
  try {
    const all = JSON.parse(localStorage.getItem(PACE_KEY) || '{}');
    all[voice] = v;
    localStorage.setItem(PACE_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable */
  }
}

function rememberSpeed(v: number) {
  try {
    localStorage.setItem(SPEED_KEY, String(v));
  } catch {
    /* storage unavailable */
  }
}

/* ── One chapter being made ─────────────────────────────────────────── */

const MediaSourceType: typeof MediaSource | undefined =
  typeof window !== 'undefined' && window.MediaSource?.isTypeSupported?.('audio/mpeg') ? window.MediaSource : undefined;

class ChapterJob {
  readonly id = `job-${Math.random().toString(36).slice(2)}`;
  readonly timingId: string;
  state: 'running' | 'done' | 'failed' | 'cancelled' = 'running';
  foreground = false;
  error: Error | null = null;

  private parts: ScriptPart[] | null = null;
  private index = 0;
  private mp3: Uint8Array[] = [];
  private totalChars = 0;
  private doneChars = 0;
  /** Seconds of audio made so far */
  private made = 0;
  private speechMade = 0;
  private work = 0;
  timings: VerseTimings = new Map([[0, 0]]);

  // Streaming to the player
  private ms: MediaSource | null = null;
  private sb: SourceBuffer | null = null;
  private queue: Uint8Array[] = [];
  private released = false;
  private ended = false;

  /** The whole chapter, once made */
  readonly finished: Promise<Blob>;
  private resolveFinished!: (b: Blob) => void;
  private rejectFinished!: (e: Error) => void;
  /** The text is in and the pieces are ready to make */
  readonly textReady: Promise<void>;
  private resolveText!: () => void;
  private rejectText!: (e: Error) => void;

  constructor(readonly ref: AiChapterRef, readonly voice: string, readonly key: string) {
    this.timingId = `ai:${key}`;
    this.finished = new Promise<Blob>((resolve, reject) => {
      this.resolveFinished = resolve;
      this.rejectFinished = reject;
    });
    this.textReady = new Promise<void>((resolve, reject) => {
      this.resolveText = resolve;
      this.rejectText = reject;
    });
    this.finished.catch(() => undefined);
    this.textReady.catch(() => undefined);
  }

  /** Total length, as well as it can be told before it's all made */
  get estimatedSeconds() {
    if (!this.parts) return 0;
    const pace = this.doneChars > 300 ? this.speechMade / this.doneChars : knownPace(this.voice) ?? 1 / DEFAULT_CHARS_PER_SECOND;
    const pauses = this.parts.slice(this.index).reduce((s, p) => s + p.pause, 0);
    return this.made + (this.totalChars - this.doneChars) * pace + pauses;
  }

  get speed() {
    if (this.work > 1) return this.made / this.work;
    // Not measured yet: what this device managed last time (graphics chips are quick)
    if (aiVoice.mode === 'cloud') return 1.1;
    return knownSpeed() ?? (aiVoice.device === 'webgpu' ? 2 : 1);
  }

  /** 0–1: how close it is to starting to play */
  get readiness() {
    if (this.released || this.state === 'done') return 1;
    const need = this.needed();
    return need <= 0 ? 0 : Math.min(0.99, this.made / need);
  }

  /** Seconds that must be made before playing can start and never catch up */
  private needed() {
    const safe = this.speed * 0.85;
    if (safe >= 1) return Math.min(4, this.estimatedSeconds);
    return this.estimatedSeconds * (1 - safe);
  }

  /** Streams it to the player as it's made. Returns what to play, or null if this phone can't. */
  attach(): string | null {
    if (!MediaSourceType) return null;
    // A fresh stream (playing the same chapter again starts it over)
    this.ms = new MediaSourceType();
    this.sb = null;
    this.queue = [];
    this.released = false;
    this.ended = false;
    const ms = this.ms;
    const url = URL.createObjectURL(ms);
    ms.addEventListener('sourceopen', () => {
      if (this.ms !== ms || this.sb) return;
      try {
        const sb = ms.addSourceBuffer('audio/mpeg');
        sb.mode = 'sequence';
        sb.addEventListener('updateend', () => this.pump());
        this.sb = sb;
        this.setDuration();
        this.maybeRelease();
        this.pump();
      } catch (error) {
        console.warn('[ai-voice] streaming not possible', error);
      }
    }, { once: true });
    return url;
  }

  private setDuration() {
    const ms = this.ms;
    const sb = this.sb;
    if (!ms || !sb || ms.readyState !== 'open' || sb.updating || this.queue.length) return;
    try {
      const buffered = sb.buffered.length ? sb.buffered.end(sb.buffered.length - 1) : 0;
      const estimate = Math.max(this.estimatedSeconds, buffered + 0.5);
      if (Number.isFinite(estimate) && Math.abs(ms.duration - estimate) > 1) ms.duration = estimate;
    } catch {
      /* tried again after the next piece */
    }
  }

  private maybeRelease() {
    if (this.released || !this.sb) return;
    if (this.state === 'done' || (this.made > 0 && this.made >= this.needed())) {
      this.released = true;
      this.queue.push(...this.mp3);
      this.pump();
    }
  }

  private pump() {
    const ms = this.ms;
    const sb = this.sb;
    if (!ms || !sb || sb.updating || ms.readyState !== 'open') return;
    const next = this.queue.shift();
    if (next) {
      try {
        sb.appendBuffer(next as unknown as BufferSource);
      } catch (error) {
        this.queue.unshift(next);
        if ((error as DOMException).name === 'QuotaExceededError') {
          // A very long chapter: let go of what's already been heard
          try {
            sb.remove(0, Math.max(1, playerTime() - 20));
          } catch {
            setTimeout(() => this.pump(), 1000);
          }
        } else {
          console.warn('[ai-voice] streaming stopped', error);
        }
      }
      return;
    }
    this.setDuration();
    if (this.state === 'done' && this.released && !this.ended) {
      this.ended = true;
      try {
        ms.endOfStream();
      } catch {
        /* already ended */
      }
    }
  }

  private progress() {
    window.dispatchEvent(
      new CustomEvent(AI_PROGRESS_EVENT, { detail: { key: this.key, readiness: this.readiness, failed: this.state === 'failed' } }),
    );
  }

  /** Does the next bit of work. False when there's nothing left to do. */
  async step(): Promise<boolean> {
    if (this.state !== 'running') return false;
    try {
      if (!this.parts) {
        await this.loadText();
        this.resolveText();
        return true;
      }
      if (this.index < this.parts.length) {
        const part = this.parts[this.index];
        const r = await aiVoice.synth(this.id, part.text, part.pause, this.voice);
        if (this.state !== 'running') return false;
        const start = this.made;
        for (const v of part.verses) {
          this.timings.set(v.verse, start + (v.at / Math.max(1, part.text.length)) * r.speechSeconds);
        }
        this.made += r.seconds;
        this.speechMade += r.speechSeconds;
        this.work += r.genSeconds;
        this.doneChars += part.text.length;
        this.index++;
        if (aiVoice.mode !== 'cloud' && this.work > 4 && this.index % 4 === 0) {
          rememberSpeed(this.speed);
          rememberPace(this.speechMade / this.doneChars, this.voice);
        }
        this.mp3.push(r.mp3);
        if (this.released) {
          this.queue.push(r.mp3);
          this.pump();
        }
        setLiveTimings(this.timingId, new Map(this.timings));
        this.maybeRelease();
        this.setDuration();
        this.progress();
        return true;
      }
      const tail = await aiVoice.end(this.id);
      if (this.state !== 'running') return false;
      if (tail.length) {
        this.mp3.push(tail);
        if (this.released) this.queue.push(tail);
      }
      this.state = 'done';
      if (aiVoice.mode !== 'cloud' && this.work > 2) {
        rememberSpeed(this.speed);
        // The graphics chip couldn't keep up comfortably: fewer quality steps from now on
        if (aiVoice.device === 'webgpu' && this.speed < 1.15) aiVoice.slower();
      }
      const blob = new Blob(this.mp3 as BlobPart[], { type: 'audio/mpeg' });
      this.maybeRelease();
      this.pump();
      this.progress();
      this.resolveFinished(blob);
      // Kept in the line until it's saved, so asking for it meanwhile finds it here
      store(this.key, blob, this.timings).finally(() => {
        if (jobs.get(this.key) === this) jobs.delete(this.key);
      });
      return false;
    } catch (error) {
      this.fail(error as Error);
      return false;
    }
  }

  private async loadText() {
    const { enhancedApiBibleService } = await import('@/services/enhancedApiBibleService');
    const data = await enhancedApiBibleService.getChapter(this.ref.version, this.ref.book, this.ref.chapter).catch(() => null);
    const verses = (data?.verses ?? []).map((v, i) => ({ verse: Number(v.verse) || i + 1, text: v.text || '' }));
    if (!verses.length) throw new Error(navigator.onLine === false ? 'offline-text' : 'no-text');
    if (!looksLikeBibleText(verses)) throw new Error('no-text');
    reportView(data?.fumsToken); // licensed text read aloud (the NIV): API.Bible's fair-use report
    const info = allBooks.find((b) => b.apiName.toLowerCase() === this.ref.book.toLowerCase());
    this.parts = buildScript(info?.name ?? this.ref.book, this.ref.chapter, info?.chapters ?? 2, verses);
    this.totalChars = this.parts.reduce((s, p) => s + p.text.length, 0);
  }

  fail(error: Error) {
    if (this.state !== 'running') return;
    this.state = 'failed';
    this.error = error;
    aiVoice.drop(this.id);
    try {
      if (this.ms?.readyState === 'open') this.ms.endOfStream('decode');
    } catch {
      /* nothing playing */
    }
    this.rejectText(error);
    this.rejectFinished(error);
    this.progress();
  }

  cancel() {
    if (this.state !== 'running') return;
    this.state = 'cancelled';
    aiVoice.drop(this.id);
    const error = new Error('cancelled');
    this.rejectText(error);
    this.rejectFinished(error);
  }
}

/* ── The line of chapters to make ───────────────────────────────────── */

const jobs = new Map<string, ChapterJob>();
let working = false;

async function runJobs() {
  if (working) return;
  working = true;
  try {
    for (;;) {
      const waiting = [...jobs.values()].filter((j) => j.state === 'running');
      // The chapter being listened to always comes first
      const job = waiting.find((j) => j.foreground) ?? waiting[0];
      if (!job) break;
      const more = await job.step();
      if (!more && job.state !== 'done' && jobs.get(job.key) === job) jobs.delete(job.key);
    }
  } finally {
    working = false;
  }
}

function jobFor(ref: AiChapterRef, voice: string, foreground: boolean) {
  const key = keyFor(voice, ref);
  let job = jobs.get(key);
  if (!job || job.state === 'failed' || job.state === 'cancelled') {
    job = new ChapterJob(ref, voice, key);
    jobs.set(key, job);
  }
  if (foreground) {
    // Only the chapter playing now, and the one after it, are worth finishing
    jobs.forEach((other) => {
      if (other !== job && other.foreground) other.cancel();
    });
    job.foreground = true;
  }
  runJobs();
  return job;
}

export const aiChapterAudio = {
  isStreamingSupported: () => !!MediaSourceType,

  /** How the player tells where it is */
  setPlayerClock(clock: () => number) {
    playerTime = clock;
  },

  /**
   * Gets a chapter ready for the player. A chapter already made plays from the
   * device; otherwise it is made now and streamed as it's made (or, on phones
   * that can't stream it, played once it's all made). Throws "offline-text"
   * or "no-text" when there's no text to read.
   */
  async prepare(ref: AiChapterRef, isCurrent: () => boolean): Promise<PreparedChapter> {
    const voice = aiVoice.voice;
    const key = keyFor(voice, ref);
    const timingId = `ai:${key}`;
    if (!jobs.has(key)) {
      const saved = await fromDevice(key);
      if (saved) {
        setLiveTimings(timingId, saved.timings);
        return { src: URL.createObjectURL(saved.blob), timingId, key };
      }
    }
    const job = jobFor(ref, voice, true);
    setLiveTimings(timingId, job.timings);
    await job.textReady;
    await aiVoice.load();
    if (!isCurrent()) throw new Error('cancelled');
    const stream = job.attach();
    if (stream) return { src: stream, timingId, key };
    const blob = await job.finished;
    if (!isCurrent()) throw new Error('cancelled');
    return { src: URL.createObjectURL(blob), timingId, key };
  },

  /** Makes a chapter ahead of time (the next one), so it starts at once. */
  prefetch(ref: AiChapterRef) {
    const voice = aiVoice.voice;
    const key = keyFor(voice, ref);
    if (jobs.has(key) || readIndex().includes(key) || aiVoice.status !== 'ready') return;
    jobFor(ref, voice, false);
  },

  /** How close the chapter is to starting (0–1), or null when it isn't being made */
  readiness(key: string): number | null {
    const job = jobs.get(key);
    return job && job.state === 'running' ? job.readiness : null;
  },

  /** Stop making chapters (the player was closed). */
  stopAll() {
    jobs.forEach((j) => j.cancel());
    jobs.clear();
  },

  async clearSaved() {
    await caches.delete(AUDIO_CACHE).catch(() => undefined);
    writeIndex([]);
  },

  keyFor: (ref: AiChapterRef) => keyFor(aiVoice.voice, ref),
};
