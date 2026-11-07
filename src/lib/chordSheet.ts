/**
 * Chord sheets written ChordPro-style: "[G]Holy is the [D/F#]Lamb". Reading them
 * into chord-over-word pieces, transposing, and plain text to copy. Anything in
 * square brackets that isn't a chord (e.g. "(Choir: Amen!)") is kept as words.
 */

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const INDEX: Record<string, number> = {
  C: 0, 'B#': 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4, 'E#': 5, F: 5, 'F#': 6, Gb: 6,
  G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11,
};

/** A chord name: a root, any quality or extension, maybe "/bass" */
const CHORD = /^[A-G][#b]?(?:maj|min|m|dim|aug|sus|add|M|°|ø|\+|-)?[0-9]*(?:(?:sus|add|maj|b|#|no)?[0-9]+)*(?:sus[24]?)?(?:\/[A-G][#b]?)?$/;
export const isChord = (s: string) => s.length <= 12 && CHORD.test(s.trim());

export interface Piece {
  chord: string | null;
  text: string;
}

/** One line as pieces: each chord with the words it sits above */
export function pieces(line: string): Piece[] {
  const out: Piece[] = [];
  const re = /\[([^\]]*)\]/g;
  let last = 0;
  let pending: string | null = null;
  let m: RegExpExecArray | null;
  const push = (text: string) => {
    if (pending === null && out.length && out[out.length - 1].chord === null) out[out.length - 1].text += text;
    else if (text || pending !== null) out.push({ chord: pending, text });
    pending = null;
  };
  while ((m = re.exec(line))) {
    const inner = m[1].trim();
    const before = line.slice(last, m.index);
    if (isChord(inner)) {
      push(before);
      pending = inner;
    } else {
      // Not a chord: keep it as words, without the brackets
      push(before + inner);
    }
    last = re.lastIndex;
  }
  push(line.slice(last));
  if (pending !== null) out.push({ chord: pending, text: '' });
  return out.filter((p) => p.chord !== null || p.text !== '');
}

/** Words only, for singing along or the music service */
export const wordsOnly = (line: string) => pieces(line).map((p) => p.text).join('').replace(/\s+/g, ' ').trim();

/** Flat keys (F, Bb, Eb, Ab, Db, Gb and the minors that use flats) are written with flats */
export function prefersFlats(key: string) {
  const k = key.trim();
  return /^(F|Bb|Eb|Ab|Db|Gb|Cb)$/.test(k) || /^(D|G|C|F|Bb|Eb|Ab)m$/.test(k);
}

function shiftNote(note: string, steps: number, flats: boolean) {
  const i = INDEX[note];
  if (i === undefined) return note;
  return (flats ? FLATS : SHARPS)[(((i + steps) % 12) + 12) % 12];
}

export function transposeChord(chord: string, steps: number, flats: boolean) {
  if (!steps) return chord;
  return chord.replace(/^([A-G][#b]?)/, (n) => shiftNote(n, steps, flats)).replace(/\/([A-G][#b]?)$/, (_, n) => `/${shiftNote(n, steps, flats)}`);
}

/** The key's name after moving it (keeps minor), spelt the way musicians write it */
export function transposeKey(key: string, steps: number) {
  const m = key.trim().match(/^([A-G][#b]?)(m?)$/);
  if (!m) return key;
  const flat = shiftNote(m[1], steps, true) + m[2];
  return prefersFlats(flat) ? flat : shiftNote(m[1], steps, false) + m[2];
}

export function transposeLine(line: string, steps: number, flats: boolean) {
  if (!steps) return line;
  return line.replace(/\[([^\]]*)\]/g, (whole, inner) => (isChord(inner) ? `[${transposeChord(inner.trim(), steps, flats)}]` : whole));
}

/** The whole song as text with chords above the words, monospace-friendly */
export function chordSheetText(song: { title: string; key: string; bpm: number; time_signature: string; sections: { name: string; lines: string[] }[] }, steps = 0) {
  const key = transposeKey(song.key, steps);
  const flats = prefersFlats(key);
  const out: string[] = [song.title, `Key: ${key} · ${song.bpm} BPM · ${song.time_signature}`, ''];
  for (const sec of song.sections) {
    out.push(`[${sec.name}]`);
    for (const raw of sec.lines) {
      const ps = pieces(transposeLine(raw, steps, flats));
      let chords = '';
      let words = '';
      for (const p of ps) {
        const width = Math.max(p.text.length, p.chord ? p.chord.length + 1 : 0);
        chords += (p.chord ?? '').padEnd(width);
        words += p.text.padEnd(width);
      }
      if (chords.trim()) out.push(chords.trimEnd());
      if (words.trim()) out.push(words.trimEnd());
    }
    out.push('');
  }
  return out.join('\n').trim();
}
