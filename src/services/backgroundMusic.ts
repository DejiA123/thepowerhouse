/**
 * Soft piano worship under the audio Bible.
 *
 * The music is played through Web Audio (decoded once and looped by the
 * audio engine itself, so it keeps going when the phone is locked) rather
 * than a second <audio> element, because:
 *  • iPhone ignores an <audio> element's volume; a Web Audio gain works
 *  • the Bible reading stays the only "now playing" item, so the lock
 *    screen keeps controlling the reading, not the music
 *
 * It follows the Bible audio element: plays while the reading plays, fades
 * out when it pauses, and carries on across chapter changes.
 *
 * Music: Kevin MacLeod (incompetech.com), licensed under CC BY 4.0.
 */

export interface WorshipTrack {
  id: string;
  name: string;
  /** Original title, for the credit */
  title: string;
  url: string;
}

export const WORSHIP_TRACKS: WorshipTrack[] = [
  { id: 'still-waters', name: 'Still Waters', title: 'Meditation Impromptu 01', url: '/audio/worship/still-waters.mp3' },
  { id: 'quiet-prayer', name: 'Quiet Prayer', title: 'Meditation Impromptu 02', url: '/audio/worship/quiet-prayer.mp3' },
  { id: 'morning-light', name: 'Morning Light', title: 'Meditation Impromptu 03', url: '/audio/worship/morning-light.mp3' },
  { id: 'gentle-hymn', name: 'Gentle Hymn', title: 'Relaxing Piano Music', url: '/audio/worship/gentle-hymn.mp3' },
];

export const MUSIC_CREDIT =
  'Piano by Kevin MacLeod (incompetech.com): "Meditation Impromptu 01, 02, 03" and "Relaxing Piano Music" (excerpts). Licensed under CC BY 4.0.';

export interface BackgroundMusicSettings {
  enabled: boolean;
  trackId: string;
  /** 0 – 1 */
  volume: number;
}

const KEY = 'bible_background_music_v1';
export const BACKGROUND_MUSIC_EVENT = 'bible-background-music-changed';
const FADE = 0.8;

const defaults: BackgroundMusicSettings = { enabled: false, trackId: WORSHIP_TRACKS[0].id, volume: 0.35 };

export function getMusicSettings(): BackgroundMusicSettings {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return defaults;
  }
}

type AudioContextCtor = typeof AudioContext;

class BackgroundMusic {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private voices: { source: AudioBufferSourceNode; gain: GainNode }[] = [];
  private stopTimer: ReturnType<typeof setTimeout> | undefined;
  private suspendTimer: ReturnType<typeof setTimeout> | undefined;
  private bible: HTMLAudioElement | null = null;
  private playing = false;
  private settings = getMusicSettings();

  /** Follow the Bible audio element. Called once by the audio provider. */
  attach(audio: HTMLAudioElement) {
    if (this.bible) return;
    this.bible = audio;
    audio.addEventListener('playing', () => this.sync());
    audio.addEventListener('play', () => this.sync());
    // A pause fades the music out; a chapter ending (or the next chapter
    // loading) waits a moment first so the music carries on between chapters
    audio.addEventListener('pause', () => this.stopIfIdle(audio.ended ? 6000 : 250));
    audio.addEventListener('emptied', () => this.stopIfIdle(6000));
    audio.addEventListener('ended', () => this.stopIfIdle(6000));

    // Phones only allow sound after a tap: get Web Audio ready on the first one
    const unlock = () => {
      if (this.settings.enabled) this.ensureContext()?.resume().catch(() => undefined);
    };
    document.addEventListener('touchend', unlock, { passive: true });
    document.addEventListener('click', unlock);
    // Back in the app after the phone interrupted audio (a call, Siri…)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.sync();
    });
  }

  get(): BackgroundMusicSettings {
    return this.settings;
  }

  update(patch: Partial<BackgroundMusicSettings>) {
    const trackChanged = patch.trackId && patch.trackId !== this.settings.trackId;
    this.settings = { ...this.settings, ...patch };
    try {
      localStorage.setItem(KEY, JSON.stringify(this.settings));
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent(BACKGROUND_MUSIC_EVENT));
    // Settings are changed with a tap, so sound is allowed here
    if (this.settings.enabled) this.ensureContext()?.resume().catch(() => undefined);
    if (this.master && this.ctx && patch.volume !== undefined) {
      this.master.gain.setTargetAtTime(this.settings.volume, this.ctx.currentTime, 0.08);
    }
    if (trackChanged && this.playing) {
      this.stopVoices(FADE);
      this.playing = false;
    }
    this.sync();
  }

  /** Warm up the chosen track so it starts without a gap. */
  preload() {
    if (this.settings.enabled) this.load(this.track());
  }

  private track() {
    return WORSHIP_TRACKS.find((t) => t.id === this.settings.trackId) ?? WORSHIP_TRACKS[0];
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor: AudioContextCtor | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      // A lower rate keeps the decoded music small in memory; plenty for soft piano
      this.ctx = new Ctor({ sampleRate: 22050 });
    } catch {
      this.ctx = new Ctor();
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = this.settings.volume;
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }

  private load(track: WorshipTrack): Promise<AudioBuffer | null> {
    let pending = this.buffers.get(track.id);
    if (!pending) {
      const ctx = this.ensureContext();
      pending = ctx
        ? fetch(track.url)
            .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
            .then((data) => ctx.decodeAudioData(data))
            .catch((error) => {
              console.warn('Background music unavailable', error);
              this.buffers.delete(track.id);
              return null;
            })
        : Promise.resolve(null);
      // Keep only the current track decoded
      this.buffers.clear();
      this.buffers.set(track.id, pending);
    }
    return pending;
  }

  private readingPlays() {
    const bible = this.bible;
    return !!bible && !bible.paused && !bible.ended && !!(bible.currentSrc || bible.src);
  }

  /** Play while the reading plays. */
  private sync() {
    if (this.settings.enabled && this.readingPlays()) {
      clearTimeout(this.stopTimer);
      clearTimeout(this.suspendTimer);
      this.start();
    } else if (this.playing && !this.settings.enabled) {
      this.stop();
    }
  }

  private stopIfIdle(afterMs: number) {
    clearTimeout(this.stopTimer);
    this.stopTimer = setTimeout(() => {
      if (this.playing && !this.readingPlays()) this.stop();
    }, afterMs);
  }

  private async start() {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    if (ctx.state !== 'running') await ctx.resume().catch(() => undefined);
    if (this.playing) return;
    this.playing = true;
    const buffer = await this.load(this.track());
    if (!buffer || !this.playing) return;
    this.master.gain.setTargetAtTime(this.settings.volume, ctx.currentTime, 0.08);
    this.startVoice(buffer);
  }

  /** The track on a loop (it has soft fades at both ends, so the loop is gentle). */
  private startVoice(buffer: AudioBuffer) {
    const ctx = this.ctx!;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + 1.5);
    source.connect(gain).connect(this.master!);
    source.start(now);
    const voice = { source, gain };
    this.voices.push(voice);
    source.onended = () => {
      this.voices = this.voices.filter((v) => v !== voice);
      try {
        gain.disconnect();
      } catch {
        /* already */
      }
    };
  }

  private stopVoices(fade: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    this.voices.forEach(({ source, gain }) => {
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + fade);
      try {
        source.stop(t + fade + 0.05);
      } catch {
        /* already stopped */
      }
    });
  }

  private stop() {
    this.playing = false;
    this.stopVoices(FADE);
    // Let the phone rest if the reading stays paused
    clearTimeout(this.suspendTimer);
    this.suspendTimer = setTimeout(() => {
      if (!this.playing) this.ctx?.suspend().catch(() => undefined);
    }, 60000);
  }
}

export const backgroundMusic = new BackgroundMusic();
