/**
 * Verse timings for narrations that come without them (the NIV, The
 * Listener's Bible), worked out on the phone from the recording itself.
 *
 * The narrator pauses between sentences, so the pauses in the audio are found
 * and matched to the verses: each verse should take about as long as its words
 * take to say (at the narrator's own pace, which changes through a chapter),
 * verses ending a sentence end at a clear pause, and a verse with two
 * sentences has a pause inside it. Tested against word-by-word timings from
 * speech recognition: about 9 verses in 10 within half a second.
 */

const FRAME = 0.02;
/** A pause this long marks the end of a sentence */
const LONG = 0.35;

interface Pause {
  /** When speech starts again (the next verse would start here) */
  at: number;
  length: number;
}

/** Where the speech is, and the pauses in it, from the decoded audio. */
function findPauses(samples: Float32Array, sampleRate: number) {
  const n = Math.max(1, Math.round(sampleRate * FRAME));
  const frames = Math.floor(samples.length / n);
  const db = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    for (let i = f * n; i < (f + 1) * n; i++) sum += samples[i] * samples[i];
    db[f] = 20 * Math.log10(Math.sqrt(sum / n) + 1e-9);
  }
  // Clearly below the loudness of speech counts as a pause
  const sorted = Array.from(db).sort((a, b) => a - b);
  const loud = sorted[Math.floor(sorted.length * 0.9)];
  const quiet = (f: number) => db[f] < loud - 22;
  let first = 0;
  while (first < frames && quiet(first)) first++;
  let last = frames - 1;
  while (last > first && quiet(last)) last--;
  const pauses: Pause[] = [];
  let run = 0;
  for (let f = first; f <= last; f++) {
    if (quiet(f)) run++;
    else {
      if (run * FRAME >= 0.08) pauses.push({ at: f * FRAME, length: run * FRAME });
      run = 0;
    }
  }
  return { start: first * FRAME, end: (last + 1) * FRAME, pauses };
}

function syllables(text: string) {
  let n = 0;
  for (const raw of text.match(/[A-Za-z']+/g) ?? []) {
    const w = raw.toLowerCase().replace(/'s?$/, '');
    let g = (w.match(/[aeiouy]+/g) ?? []).length;
    if (w.endsWith('e') && g > 1 && !w.endsWith('le') && !w.endsWith('ee')) g--;
    n += Math.max(1, g);
  }
  return n;
}

/** How long a verse takes to say, in syllables (with the pauses at punctuation inside it) */
function spokenLength(text: string) {
  const inner = text.trim().slice(0, -1);
  return syllables(text) + 1.2 * (inner.match(/[,;:—-]/g) ?? []).length + 2.5 * (inner.match(/[.?!]/g) ?? []).length;
}

const sentenceEnd = (text: string) => /[.?!;:]["'”’)\]]*$/.test(text.trim());
const innerBreaks = (text: string) => (text.trim().replace(/["'”’)\]\s]+$/, '').slice(0, -1).match(/[.?!;]/g) ?? []).length;

/** Matches the verses (plus anything announced first) to the pauses. Returns each unit's start time. */
function match(units: string[], start: number, end: number, pauses: Pause[], announced: boolean, pace?: number[]) {
  const lengths = units.map(spokenLength);
  const breaks = units.map(innerBreaks);
  const ends = units.map(sentenceEnd);
  const total = lengths.reduce((a, b) => a + b, 0) || 1;
  const rate = (end - start) / total;
  const times = [start, ...pauses.map((p) => p.at)];
  const lens = [0, ...pauses.map((p) => p.length)];
  const longBefore = [0];
  lens.forEach((l, i) => longBefore.push(longBefore[i] + (l >= LONG ? 1 : 0)));
  const M = times.length;
  const N = units.length;
  const expected = (i: number) => lengths[i] * (pace ? pace[i] : rate);
  const span = (i: number, from: number, to: number, toTime: number) => {
    const d = expected(i);
    const inside = longBefore[to] - longBefore[from + 1];
    return ((toTime - times[from] - d) / (0.25 * d + 0.5)) ** 2 + 1.5 * Math.abs(inside - breaks[i]);
  };
  const pauseScore = (p: number, sentence: boolean) => (sentence ? 2.5 : 1) * Math.log(1 + 8 * p);

  const dp: Float64Array[] = Array.from({ length: N }, () => new Float64Array(M).fill(Infinity));
  const back: Int32Array[] = Array.from({ length: N }, () => new Int32Array(M).fill(-1));
  dp[0][0] = 0;
  // Unannounced chapters may still have a moment before verse 1
  if (!announced) for (let j = 1; j < M && times[j] - start <= 6; j++) dp[0][j] = 3;
  for (let i = 1; i < N; i++) {
    const d = expected(i - 1);
    for (let j = 1; j < M; j++) {
      let best = Infinity;
      let arg = -1;
      for (let k = j - 1; k >= 0; k--) {
        const gap = times[j] - times[k];
        if (gap > 3 * d + 8) break;
        if (dp[i - 1][k] === Infinity || gap < 0.4) continue;
        const c = dp[i - 1][k] + span(i - 1, k, j, times[j]) - pauseScore(lens[j], ends[i - 1]);
        if (c < best) {
          best = c;
          arg = k;
        }
      }
      dp[i][j] = best;
      back[i][j] = arg;
    }
  }
  // The last unit runs to the end of the speech
  let j = 0;
  let best = Infinity;
  for (let k = 0; k < M; k++) {
    if (dp[N - 1][k] === Infinity) continue;
    const d = expected(N - 1);
    const inside = longBefore[M] - longBefore[k + 1];
    const c = dp[N - 1][k] + ((end - times[k] - d) / (0.25 * d + 0.5)) ** 2 + 1.5 * Math.abs(inside - breaks[N - 1]);
    if (c < best) {
      best = c;
      j = k;
    }
  }
  const starts = new Array<number>(N).fill(start);
  for (let i = N - 1; i >= 0 && j >= 0; i--) {
    starts[i] = times[j];
    j = back[i][j];
  }
  return { starts, lengths };
}

/**
 * Verse number → start time (seconds) for a narrated chapter.
 * `announced`: what the narrator says before verse 1 (a book's first chapter,
 * a psalm's number and title), or '' when the chapter starts at verse 1.
 */
export function timingsFromAudio(samples: Float32Array, sampleRate: number, verses: { verse: number; text: string }[], announced: string) {
  const { start, end, pauses } = findPauses(samples, sampleRate);
  const units = announced ? [announced, ...verses.map((v) => v.text)] : verses.map((v) => v.text);
  // Twice: the second time at the narrator's own pace around each verse
  const first = match(units, start, end, pauses, !!announced);
  const bounds = [...first.starts, end];
  const rates = first.lengths.map((l, i) => (bounds[i + 1] - bounds[i]) / Math.max(1, l));
  const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };
  const pace = rates.map((_, i) => median(rates.slice(Math.max(0, i - 4), i + 5)));
  const { starts } = match(units, start, end, pauses, !!announced, pace);
  const verseStarts = announced ? starts.slice(1) : starts;
  const map = new Map<number, number>([[0, 0]]);
  verses.forEach((v, i) => map.set(v.verse, Math.max(0, verseStarts[i] - 0.05)));
  return map;
}

/** Decodes a narrated chapter quietly (in mono, at a low rate: only loudness is needed). */
export async function decodeForTimings(audio: ArrayBuffer): Promise<{ samples: Float32Array; sampleRate: number }> {
  const rate = 16000;
  const Offline = (window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  const ctx = new Offline(1, rate, rate) as OfflineAudioContext;
  const decoded: AudioBuffer = await new Promise((resolve, reject) => {
    const p = ctx.decodeAudioData(audio, resolve, reject);
    if (p && typeof (p as Promise<AudioBuffer>).then === 'function') (p as Promise<AudioBuffer>).then(resolve, reject);
  });
  // Mono: the channels mixed
  const samples = new Float32Array(decoded.length);
  for (let c = 0; c < decoded.numberOfChannels; c++) {
    const data = decoded.getChannelData(c);
    for (let i = 0; i < data.length; i++) samples[i] += data[i] / decoded.numberOfChannels;
  }
  return { samples, sampleRate: decoded.sampleRate };
}
