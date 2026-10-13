/**
 * Verse start times for the audio Bible, so the reader can highlight and
 * follow the verse being read.
 *
 * KJV audio is Faith Comes By Hearing's KJV recording (ENGKJVO1DA / ENGKJVN1DA);
 * the ESV, NLT and NKJV narrations are theirs too. Bible Brain publishes exact
 * verse timestamps for those recordings. Chapters read by the AI voice know
 * their own timings as they are made (setLiveTimings). Timings are cached on
 * the device so following along also works offline. If timings can't be
 * loaded, they are estimated from verse lengths.
 */
import { bibleBooks } from '@/components/bible/BibleBookList';
import { BIBLE_BRAIN_KEY, BOOK_CODES } from '@/services/audioBible/narrated';

const API = 'https://4.dbt.io/api/timestamps';
const CACHE = 'bible-verse-timings-v1';

const OT = new Set(bibleBooks['Old Testament'].map((b) => b.apiName));

/** verse number → start time (seconds). Index 0 is the chapter announcement. */
export type VerseTimings = Map<number, number>;

const memory = new Map<string, VerseTimings | null>();
const inflight = new Map<string, Promise<VerseTimings | null>>();

/** Timings of AI-voice chapters, filled in while the chapter is being made */
const live = new Map<string, VerseTimings>();
export const TIMINGS_EVENT = 'verse-timings:changed';

export function setLiveTimings(source: string, timings: VerseTimings) {
  live.set(source, timings);
  window.dispatchEvent(new CustomEvent(TIMINGS_EVENT, { detail: source }));
}

/** KJV keeps its original cache addresses; other recordings are kept apart */
const cacheKey = (fileset: string | null, book: string, chapter: number) =>
  fileset ? `/verse-timings/${fileset}/${book}/${chapter}` : `/verse-timings/${book}/${chapter}`;

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

/**
 * `source` is what is being played: "KJV" (default), a Bible Brain fileset
 * such as "ENGESVN1DA", or "ai:…" for a chapter read by the AI voice.
 */
export async function getVerseTimings(bookApiName: string, chapter: number, source = 'KJV'): Promise<VerseTimings | null> {
  if (source.startsWith('ai:')) return live.get(source) ?? null;
  const book = bookApiName.toLowerCase();
  const fileset = source === 'KJV' ? null : source;
  const key = cacheKey(fileset, book, chapter);
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
    const id = fileset ?? (OT.has(book) ? 'ENGKJVO1DA' : 'ENGKJVN1DA');
    try {
      const res = await fetch(`${API}/${id}/${code}/${chapter}?key=${BIBLE_BRAIN_KEY}&v=4`);
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
