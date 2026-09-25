/**
 * Ringtones synthesised with Web Audio (no audio files to download or fail).
 * Browsers only allow sound after the user has interacted with the page, so
 * the context is unlocked on the first tap anywhere in the app.
 */
let ctx: AudioContext | null = null;

const getCtx = () => {
  if (!ctx) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
  }
  return ctx;
};

/*
 * A running AudioContext holds on to the iPhone's audio session. Left running,
 * it stopped the audio Bible from resuming properly from the lock screen
 * (Play showed, but no sound). So it runs only while a sound plays.
 */
let activeRingtones = 0;
let sleepTimer: ReturnType<typeof setTimeout> | undefined;

const wake = async (c: AudioContext) => {
  clearTimeout(sleepTimer);
  if (c.state !== 'running') await c.resume().catch(() => undefined);
};

const sleepSoon = (c: AudioContext, afterMs = 1200) => {
  clearTimeout(sleepTimer);
  sleepTimer = setTimeout(() => {
    if (activeRingtones === 0 && c.state === 'running') c.suspend().catch(() => undefined);
  }, afterMs);
};

export function installAudioUnlock() {
  const unlock = () => {
    const c = getCtx();
    // Unlock once inside a tap (browsers require it), then go straight back to sleep
    c?.resume().then(() => c.suspend()).catch(() => undefined);
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
}

function tone(c: AudioContext, freqs: number[], start: number, duration: number, volume: number) {
  const gain = c.createGain();
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.02);
  gain.gain.setValueAtTime(volume, start + duration - 0.05);
  gain.gain.linearRampToValueAtTime(0, start + duration);
  gain.connect(c.destination);
  freqs.forEach((f) => {
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f;
    osc.connect(gain);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  });
}

/**
 * incoming: a bright three-note chime every 2.4s (+ vibration on phones)
 * outgoing: the familiar double "ring-ring" you hear while waiting for an answer
 */
export function startRingtone(kind: 'incoming' | 'outgoing'): () => void {
  const c = getCtx();
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const cycle = () => {
    if (stopped) return;
    if (c && c.state === 'running') {
      const t = c.currentTime + 0.05;
      if (kind === 'incoming') {
        tone(c, [659.25], t, 0.18, 0.18);        // E5
        tone(c, [783.99], t + 0.2, 0.18, 0.18);  // G5
        tone(c, [1046.5], t + 0.4, 0.34, 0.16);  // C6
        tone(c, [659.25], t + 1.0, 0.18, 0.18);
        tone(c, [783.99], t + 1.2, 0.18, 0.18);
        tone(c, [1046.5], t + 1.4, 0.34, 0.16);
      } else {
        tone(c, [400, 450], t, 0.4, 0.06);
        tone(c, [400, 450], t + 0.6, 0.4, 0.06);
      }
    }
    if (kind === 'incoming' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([300, 150, 300]);
      } catch {
        /* not allowed */
      }
    }
    timer = setTimeout(cycle, kind === 'incoming' ? 2400 : 3000);
  };

  activeRingtones++;
  if (c) wake(c).then(cycle);
  else cycle();

  return () => {
    if (stopped) return;
    stopped = true;
    activeRingtones = Math.max(0, activeRingtones - 1);
    clearTimeout(timer);
    if (c) sleepSoon(c, 400);
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(0);
      } catch {
        /* ignore */
      }
    }
  };
}

/** Short blips for joins / leaves / call end. */
export async function playCue(kind: 'join' | 'leave' | 'end') {
  const c = getCtx();
  if (!c) return;
  await wake(c);
  if (c.state !== 'running') return;
  sleepSoon(c);
  const t = c.currentTime + 0.02;
  if (kind === 'join') {
    tone(c, [523.25], t, 0.12, 0.12);
    tone(c, [783.99], t + 0.13, 0.16, 0.12);
  } else if (kind === 'leave') {
    tone(c, [783.99], t, 0.12, 0.12);
    tone(c, [523.25], t + 0.13, 0.16, 0.12);
  } else {
    tone(c, [440], t, 0.15, 0.12);
    tone(c, [349.23], t + 0.17, 0.25, 0.12);
  }
}
