/**
 * Bible text made ready to be read aloud: the chapter announced like a
 * narrator would ("John, chapter three."), numbers in words, "LORD" read as
 * "Lord", footnote marks and stray symbols dropped, and verses grouped into
 * pieces of a comfortable length for the voice.
 */

export interface ScriptPart {
  text: string;
  /** Verses starting in this piece, with where they start in its text */
  verses: { verse: number; at: number }[];
  /** Silence after the piece, in seconds */
  pause: number;
}

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function underThousand(n: number): string {
  const words: string[] = [];
  if (n >= 100) {
    words.push(`${ONES[Math.floor(n / 100)]} hundred`);
    n %= 100;
    if (n) words.push('and');
  }
  if (n >= 20) words.push(TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ''));
  else if (n > 0 || !words.length) words.push(ONES[n]);
  return words.join(' ');
}

export function numberToWords(n: number): string {
  if (!Number.isFinite(n) || n < 0 || n >= 1e12) return String(n);
  if (n < 1000) return underThousand(n);
  const parts: string[] = [];
  const scales: [number, string][] = [[1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand']];
  let rest = n;
  for (const [size, name] of scales) {
    if (rest >= size) {
      parts.push(`${underThousand(Math.floor(rest / size))} ${name}`);
      rest %= size;
    }
  }
  if (rest) parts.push(rest < 100 ? `and ${underThousand(rest)}` : underThousand(rest));
  return parts.join(' ');
}

const ORDINAL: Record<string, string> = {
  one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth',
};

function ordinalWords(n: number) {
  const words = numberToWords(n);
  return words.replace(/(\w+)$/, (last) => ORDINAL[last] ?? (last.endsWith('y') ? `${last.slice(0, -1)}ieth` : `${last}th`));
}

/** "1 Corinthians" → "First Corinthians" */
export function spokenBookName(name: string) {
  return name.replace(/^([123]) /, (_, d: string) => `${['First', 'Second', 'Third'][Number(d) - 1]} `);
}

/** One verse's text as it should be spoken. */
export function speakable(raw: string): string {
  let text = raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, "'")
    // Footnote and cross-reference marks: [a], (b), ¹, *
    .replace(/\[[a-z]{1,2}\]|\([a-z]\)(?=\s|$)|[¹²³⁰-⁹*†‡]/g, '')
    .replace(/&/g, ' and ');

  // LORD, GOD, I AM: capitals are for the eye, not the ear
  text = text.replace(/\b[A-Z]{2,}(?:'S)?\b/g, (w) => (/^(?:I{1,3}|IV|VI{0,3}|IX|X)$/.test(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()));

  // 1st, 2nd, 3rd…
  text = text.replace(/\b(\d+)(st|nd|rd|th)\b/gi, (_, d: string) => ordinalWords(Number(d)));
  // 144,000 and 1000
  text = text.replace(/\b\d{1,3}(?:,\d{3})+\b|\b\d+\b/g, (d) => numberToWords(Number(d.replace(/,/g, ''))));

  return text.replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim();
}

/** Splits text that is too long for one piece at sentence (or clause) breaks. */
function splitLong(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const sentences = text.match(/[^.!?;:]+[.!?;:]+["')\]]*\s*|[^.!?;:]+$/g) ?? [text];
  const out: string[] = [];
  let current = '';
  for (const s of sentences) {
    if (current && (current + s).length > max) {
      out.push(current.trim());
      current = '';
    }
    if (s.length > max) {
      // A very long sentence: break at commas, then at spaces
      for (const piece of s.split(/(?<=,)\s+/)) {
        if (current && (current + ' ' + piece).length > max) {
          out.push(current.trim());
          current = '';
        }
        if (piece.length > max) {
          const words = piece.split(' ');
          for (const w of words) {
            if (current && (current + ' ' + w).length > max) {
              out.push(current.trim());
              current = '';
            }
            current += (current ? ' ' : '') + w;
          }
        } else current += (current ? ' ' : '') + piece;
      }
    } else current += s;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

const TARGET = 230;
const MAX = 290;

/**
 * The chapter as pieces to speak, in order. Verses are kept whole where
 * possible and grouped until a piece is a comfortable length.
 */
export function buildScript(bookName: string, chapter: number, totalChapters: number, verses: { verse: number; text: string }[]): ScriptPart[] {
  const spokenBook = spokenBookName(bookName);
  const intro = /^psalms?$/i.test(bookName)
    ? `Psalm ${numberToWords(chapter)}.`
    : totalChapters === 1
      ? `${spokenBook}.`
      : `${spokenBook}, chapter ${numberToWords(chapter)}.`;
  const parts: ScriptPart[] = [{ text: intro, verses: [{ verse: 0, at: 0 }], pause: 0.7 }];

  let current: ScriptPart | null = null;
  const flush = () => {
    if (current && current.text) parts.push(current);
    current = null;
  };

  for (const v of verses) {
    const text = speakable(v.text);
    if (!text) continue;
    const pieces = splitLong(text, MAX);
    pieces.forEach((piece, i) => {
      const startsVerse = i === 0;
      if (current && (current.text.length + 1 + piece.length > TARGET || !startsVerse)) flush();
      if (!current) current = { text: '', verses: [], pause: 0.32 };
      if (startsVerse) current.verses.push({ verse: v.verse, at: current.text ? current.text.length + 1 : 0 });
      current.text += (current.text ? ' ' : '') + piece;
      // A piece ending mid-sentence flows on without a pause
      current.pause = /[.!?]["')\]]*$/.test(current.text) ? 0.32 : 0.12;
    });
  }
  flush();
  if (parts.length > 1) parts[parts.length - 1].pause = 0.9;
  return parts;
}

/** Text sources sometimes put a notice in place of the Bible text. */
export function looksLikeBibleText(verses: { text: string }[]) {
  const sample = verses.slice(0, 3).map((v) => v.text).join(' ');
  return verses.length > 0 && !/has prohibited me from using|not available in this translation/i.test(sample);
}
