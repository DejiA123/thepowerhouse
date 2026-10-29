/**
 * Plays the other people in a call, one hidden <audio> each. The elements are
 * made when the call starts and kept until it ends, so an output chosen for
 * them (the iPhone's earpiece) also covers people who join later: Safari only
 * lets a page choose where sound plays within a few seconds of a tap.
 */
export class CallAudio {
  private host = document.createElement('div');
  private elements: HTMLAudioElement[] = [];
  private playing = new Map<string, HTMLAudioElement>();

  constructor(size: number) {
    this.host.hidden = true;
    for (let i = 0; i < size; i++) {
      const el = document.createElement('audio');
      el.autoplay = true;
      el.setAttribute('playsinline', '');
      this.host.appendChild(el);
      this.elements.push(el);
    }
    document.body.appendChild(this.host);
  }

  play(userId: string, stream: MediaStream) {
    let el = this.playing.get(userId);
    if (!el) {
      const inUse = new Set(this.playing.values());
      el = this.elements.find((e) => !inUse.has(e));
      if (!el) return;
      this.playing.set(userId, el);
    }
    if (el.srcObject !== stream) el.srcObject = stream;
    if (el.paused) el.play().catch(() => undefined);
  }

  remove(userId: string) {
    const el = this.playing.get(userId);
    if (!el) return;
    el.srcObject = null;
    this.playing.delete(userId);
  }

  /** Send everyone's voice to this output. False if the browser refused (e.g. no recent tap). */
  async setOutput(deviceId: string) {
    try {
      await Promise.all(this.elements.map((el) => el.setSinkId(deviceId)));
      return true;
    } catch (error) {
      console.warn('[call] could not choose where the call plays', error);
      return false;
    }
  }

  stop() {
    this.elements.forEach((el) => {
      el.srcObject = null;
    });
    this.playing.clear();
    this.host.remove();
  }
}
