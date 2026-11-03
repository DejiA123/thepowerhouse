/**
 * Plays the other people in a call.
 *
 * Everywhere: one hidden <audio> each, made when the call starts and kept until
 * it ends, so an output chosen for them also covers people who join later
 * (Safari only lets a page choose where sound plays within a few seconds of a tap).
 *
 * iPhone ("relay"): newer iOS ignores setSinkId on an <audio> that plays a call's
 * stream directly (call audio skips the media element's output path), so the
 * earpiece/loudspeaker switch did nothing. Instead everyone's voice is mixed in
 * Web Audio into ONE stream, played by ONE <audio> whose output is switched
 * (the approach LiveKit uses for iOS). The per-person elements stay, muted, so
 * the streams keep flowing. If the relay can't start, it falls back to the
 * per-person elements, so a call never goes silent.
 */
export class CallAudio {
  private host = document.createElement('div');
  private elements: HTMLAudioElement[] = [];
  private playing = new Map<string, HTMLAudioElement>();

  // The relay (iPhone)
  private ctx: AudioContext | null = null;
  private dest: MediaStreamAudioDestinationNode | null = null;
  private relayEl: HTMLAudioElement | null = null;
  private sources = new Map<string, { source: MediaStreamAudioSourceNode; stream: MediaStream }>();
  /** 'relay' (mixed, one switchable player) or 'direct' (one player each) */
  mode: 'relay' | 'direct' = 'direct';
  /** Why the relay isn't used (for the sound report) */
  relayNote = '';

  constructor(size: number, opts: { relay?: boolean } = {}) {
    this.host.hidden = true;
    for (let i = 0; i < size; i++) {
      const el = document.createElement('audio');
      el.autoplay = true;
      el.setAttribute('playsinline', '');
      this.host.appendChild(el);
      this.elements.push(el);
    }
    document.body.appendChild(this.host);
    if (opts.relay) this.startRelay();
  }

  /** Called straight from the tap (Call / Answer): iPhone only starts sound from a tap */
  private startRelay() {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      void ctx.resume();
      const dest = ctx.createMediaStreamDestination();
      const el = document.createElement('audio');
      el.autoplay = true;
      el.setAttribute('playsinline', '');
      el.srcObject = dest.stream;
      this.host.appendChild(el);
      el.play().catch((e) => this.fallBack(`the relay player didn't start (${(e as Error)?.name || e})`));
      this.ctx = ctx;
      this.dest = dest;
      this.relayEl = el;
      this.mode = 'relay';
      // Still not running a moment later (no tap, or the phone refused): play directly instead
      setTimeout(() => {
        if (this.mode === 'relay' && this.ctx && this.ctx.state !== 'running') this.fallBack(`sound engine is ${this.ctx.state}`);
      }, 1500);
    } catch (e) {
      this.fallBack(`no sound engine (${(e as Error)?.message || e})`);
    }
  }

  /** The relay didn't work: everyone plays through their own <audio> again */
  private fallBack(why: string) {
    if (this.mode !== 'relay') return;
    this.mode = 'direct';
    this.relayNote = why;
    this.sources.forEach(({ source }) => {
      try {
        source.disconnect();
      } catch {
        /* already */
      }
    });
    this.sources.clear();
    this.playing.forEach((el) => {
      el.muted = false;
      if (el.paused) el.play().catch(() => undefined);
    });
    if (this.relayEl) {
      this.relayEl.srcObject = null;
      this.relayEl.remove();
      this.relayEl = null;
    }
    this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.dest = null;
  }

  play(userId: string, stream: MediaStream) {
    let el = this.playing.get(userId);
    if (!el) {
      const inUse = new Set(this.playing.values());
      el = this.elements.find((e) => !inUse.has(e));
      if (!el) return;
      this.playing.set(userId, el);
    }
    // In the relay the voice is heard through the one switchable player; this one only keeps the stream flowing
    el.muted = this.mode === 'relay';
    if (el.srcObject !== stream) el.srcObject = stream;
    if (el.paused) el.play().catch(() => undefined);

    if (this.mode === 'relay' && this.ctx && this.dest && stream.getAudioTracks().length) {
      const known = this.sources.get(userId);
      if (known?.stream === stream) return;
      try {
        known?.source.disconnect();
      } catch {
        /* already */
      }
      try {
        const source = this.ctx.createMediaStreamSource(stream);
        source.connect(this.dest);
        this.sources.set(userId, { source, stream });
        if (this.ctx.state !== 'running') void this.ctx.resume();
      } catch (e) {
        this.fallBack(`couldn't mix in a voice (${(e as Error)?.message || e})`);
      }
    }
  }

  remove(userId: string) {
    const known = this.sources.get(userId);
    if (known) {
      try {
        known.source.disconnect();
      } catch {
        /* already */
      }
      this.sources.delete(userId);
    }
    const el = this.playing.get(userId);
    if (!el) return;
    el.srcObject = null;
    el.muted = false;
    this.playing.delete(userId);
  }

  /** Any tap during the call: wake the sound engine if the phone paused it */
  wake() {
    if (this.ctx && this.ctx.state !== 'running') void this.ctx.resume();
    if (this.relayEl?.paused) this.relayEl.play().catch(() => undefined);
  }

  /** Why the last choice of output was refused (shown in the sound report) */
  lastError = '';

  /** Send everyone's voice to this output ('' = the phone's own choice). False if the browser refused (e.g. no recent tap). */
  async setOutput(deviceId: string) {
    // The relay player carries everyone's voice; the others too, so a fallback keeps the choice
    const targets = this.relayEl ? [this.relayEl, ...this.elements] : this.elements;
    try {
      await Promise.all(targets.map((el) => el.setSinkId(deviceId)));
      // Make sure it took (some versions quietly keep the old one)
      const took = targets.every((el) => {
        const sink = (el as HTMLAudioElement & { sinkId?: string }).sinkId;
        return typeof sink !== 'string' || sink === deviceId;
      });
      if (!took) {
        this.lastError = 'the phone kept the previous output';
        return false;
      }
      // Playing ones pick the new output up straight away
      [...this.playing.values(), ...(this.relayEl ? [this.relayEl] : [])].forEach((el) => {
        if (el.paused) el.play().catch(() => undefined);
      });
      this.wake();
      this.lastError = '';
      return true;
    } catch (error) {
      this.lastError = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      console.warn('[call] could not choose where the call plays', error);
      return false;
    }
  }

  /** For the sound report */
  describe() {
    return this.mode === 'relay'
      ? `relay (one player for everyone; sound engine ${this.ctx?.state ?? 'none'}, ${this.sources.size} voice${this.sources.size === 1 ? '' : 's'} mixed)`
      : `direct (one player each)${this.relayNote ? `; relay not used: ${this.relayNote}` : ''}`;
  }

  stop() {
    this.sources.forEach(({ source }) => {
      try {
        source.disconnect();
      } catch {
        /* already */
      }
    });
    this.sources.clear();
    this.elements.forEach((el) => {
      el.srcObject = null;
    });
    if (this.relayEl) this.relayEl.srcObject = null;
    this.ctx?.close().catch(() => undefined);
    this.playing.clear();
    this.host.remove();
  }
}
