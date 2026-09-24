/**
 * Verse start times for the KJV audio Bible, so the reader can highlight and
 * follow the verse being read.
 *
 * The audio files are Faith Comes By Hearing's KJV recordings (ENGKJVO1DA /
 * ENGKJVN1DA). Bible Brain publishes exact verse timestamps for those same
 * recordings. Timings are cached on the device so following along also works
 * offline. If timings can't be loaded, they are estimated from verse lengths.
 */
import { bibleBooks } from '@/components/bible/BibleBookList';

const API = 'https://4.dbt.io/api/timestamps';
const KEY = '56e1f369-6e9b-4f68-aa20-5f51c1111eef'; // public Bible Brain key already used by the app
const CACHE = 'bible-verse-timings-v1';

const BOOK_CODES: Record<string, string> = {
  genesis: 'GEN', exodus: 'EXO', leviticus: 'LEV', numbers: 'NUM', deuteronomy: 'DEU', joshua: 'JOS',
  judges: 'JDG', ruth: 'RUT', '1-samuel': '1SA', '2-samuel': '2SA', '1-kings': '1KI', '2-kings': '2KI',
  '1-chronicles': '1CH', '2-chronicles': '2CH', ezra: 'EZR', nehemiah: 'NEH', esther: 'EST', job: 'JOB',
  psalms: 'PSA', proverbs: 'PRO', ecclesiastes: 'ECC', 'song-of-solomon': 'SNG', isaiah: 'ISA',
  jeremiah: 'JER', lamentations: 'LAM', ezekiel: 'EZK', daniel: 'DAN', hosea: 'HOS', joel: 'JOL',
  amos: 'AMO', obadiah: 'OBA', jonah: 'JON', micah: 'MIC', nahum: 'NAM', habakkuk: 'HAB',
  zephaniah: 'ZEP', haggai: 'HAG', zechariah: 'ZEC', malachi: 'MAL', matthew: 'MAT', mark: 'MRK',
  luke: 'LUK', john: 'JHN', acts: 'ACT', romans: 'ROM', '1-corinthians': '1CO', '2-corinthians': '2CO',
  galatians: 'GAL', ephesians: 'EPH', philippians: 'PHP', colossians: 'COL', '1-thessalonians': '1TH',
  '2-thessalonians': '2TH', '1-timothy': '1TI', '2-timothy': '2TI', titus: 'TIT', philemon: 'PHM',
  hebrews: 'HEB', james: 'JAS', '1-peter': '1PE', '2-peter': '2PE', '1-john': '1JN', '2-john': '2JN',
  '3-john': '3JN', jude: 'JUD', revelation: 'REV',
};

const OT = new Set(bibleBooks['Old Testament'].map((b) => b.apiName));

/** verse number → start time (seconds). Index 0 is the chapter announcement. */
export type VerseTimings = Map<number, number>;

const memory = new Map<string, VerseTimings | null>();
const inflight = new Map<string, Promise<VerseTimings | null>>();

const cacheKey = (book: string, chapter: number) => `/verse-timings/${book}/${chapter}`;

async function readCached(key: string): Promise<[number, number][] | null> {
  try {
    if (!('caches' in window)) return null;
    const hit = await (await caches.open(CACHE)).match(key);
    return hit ? await hit.json() : null;
  } catch {
    return null;
  }
}

async function writeCached(key: string, entries: [number, number][]) {
  try {
    if (!('caches' in window)) return;
    await (await caches.open(CACHE)).put(key, new Response(JSON.stringify(entries), { headers: { 'Content-Type': 'application/json' } }));
  } catch {
    /* storage unavailable */
  }
}

export async function getVerseTimings(bookApiName: string, chapter: number): Promise<VerseTimings | null> {
  const book = bookApiName.toLowerCase();
  const key = cacheKey(book, chapter);
  if (memory.has(key)) return memory.get(key)!;
  if (inflight.has(key)) return inflight.get(key)!;

  const load = (async () => {
    const cached = await readCached(key);
    if (cached?.length) {
      const map = new Map(cached);
      memory.set(key, map);
      return map;
    }
    const code = BOOK_CODES[book];
    if (!code || navigator.onLine === false) return null;
    const fileset = OT.has(book) ? 'ENGKJVO1DA' : 'ENGKJVN1DA';
    try {
      const res = await fetch(`${API}/${fileset}/${code}/${chapter}?key=${KEY}&v=4`);
      if (!res.ok) return null;
      const json = await res.json();
      const entries: [number, number][] = (json?.data || [])
        .map((row: any) => [Number(row.verse_start), Number(row.timestamp)] as [number, number])
        .filter(([v, t]: [number, number]) => Number.isFinite(v) && Number.isFinite(t));
      if (entries.length < 2) return null;
      writeCached(key, entries);
      const map = new Map(entries);
      memory.set(key, map);
      return map;
    } catch {
      return null;
    }
  })();

  inflight.set(key, load);
  const result = await load;
  inflight.delete(key);
  if (!memory.has(key)) memory.set(key, result);
  return result;
}

/** Fallback: spread the chapter duration across verses by their length. */
export function estimateVerseTimings(verseLengths: { verse: number; length: number }[], duration: number): VerseTimings {
  const intro = Math.min(4, duration * 0.02); // "Genesis chapter one…"
  const total = verseLengths.reduce((sum, v) => sum + Math.max(1, v.length), 0) || 1;
  const map: VerseTimings = new Map([[0, 0]]);
  let t = intro;
  verseLengths.forEach((v) => {
    map.set(v.verse, t);
    t += ((duration - intro) * Math.max(1, v.length)) / total;
  });
  return map;
}

/** Which verse is being read at `time`. */
export function verseAt(timings: VerseTimings, time: number): number | null {
  let current: number | null = null;
  let best = -Infinity;
  timings.forEach((start, verse) => {
    if (verse > 0 && start <= time + 0.15 && start > best) {
      best = start;
      current = verse;
    }
  });
  return current;
}
