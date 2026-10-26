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
import { BIBLE_BRAIN_KEY, BOOK_CODES, narratedKey, streamUrlFor } from '@/services/audioBible/narrated';
import { API_BIBLE_BASE_URL, API_BIBLE_KEY, API_NIV_TEXT_ID } from '@/services/apiBible';

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
  // API.Bible's recordings (the NIV) come without verse timings: worked out from the audio
  if (source.startsWith('ABS-')) return narrationTimings(bookApiName.toLowerCase(), chapter, source);
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

/* ── Narrations without published timings (the NIV) ─────────────────── */

/** What the narrator says before verse 1: a book's first chapter, a psalm's number and title */
async function announcement(book: string, chapter: number): Promise<string> {
  const name = bibleBooks['Old Testament'].concat(bibleBooks['New Testament']).find((b) => b.apiName === book)?.name ?? book;
  if (book === 'psalms') {
    const key = `psalm_title_${chapter}`;
    let title = localStorage.getItem(key);
    if (title === null) {
      try {
        const res = await fetch(
          `${API_BIBLE_BASE_URL}/bibles/${API_NIV_TEXT_ID}/chapters/PSA.${chapter}?content-type=text&include-notes=false&include-titles=true&include-chapter-numbers=false&include-verse-numbers=true`,
          { headers: { 'api-key': API_BIBLE_KEY } },
        );
        const content: string = (await res.json())?.data?.content ?? '';
        title = (content.split('[1]')[0] ?? '').replace(new RegExp(`Psalm\\s+${chapter}`), '').replace(/\s+/g, ' ').trim();
        localStorage.setItem(key, title);
      } catch {
        title = '';
      }
    }
    return `Psalm ${chapter}. ${title}`.trim();
  }
  return chapter === 1 ? `The book of ${name}, chapter one.` : '';
}

const working = new Map<string, Promise<VerseTimings | null>>();

/** Works out (once, then kept) the verse timings of a narrated chapter from its audio. */
function narrationTimings(book: string, chapter: number, source: string): Promise<VerseTimings | null> {
  const key = cacheKey(`${source}-v1`, book, chapter);
  if (memory.has(key)) return Promise.resolve(memory.get(key)!);
  if (working.has(key)) return working.get(key)!;
  const job = (async () => {
    const cached = await readCached(key);
    if (cached?.length) {
      const map = new Map(cached);
      memory.set(key, map);
      return map;
    }
    if (navigator.onLine === false) return null;
    try {
      const audioKey = narratedKey(source, book, chapter);
      if (!audioKey) return null;
      const [{ enhancedApiBibleService }, { decodeForTimings, timingsFromAudio }] = await Promise.all([
        import('@/services/enhancedApiBibleService'),
        import('@/services/audioBible/narrationTimings'),
      ]);
      const [text, audio, intro] = await Promise.all([
        enhancedApiBibleService.getChapter('NIV', book, chapter),
        streamUrlFor(audioKey).then((url) => fetch(url)).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`audio ${r.status}`)))),
        announcement(book, chapter),
      ]);
      const verses = (text?.verses ?? []).map((v, i) => ({ verse: Number(v.verse) || i + 1, text: v.text || '' })).filter((v) => v.text);
      if (!verses.length) return null;
      const { samples, sampleRate } = await decodeForTimings(audio);
      const map = timingsFromAudio(samples, sampleRate, verses, intro);
      writeCached(key, [...map.entries()]);
      memory.set(key, map);
      window.dispatchEvent(new CustomEvent(TIMINGS_EVENT, { detail: source }));
      return map;
    } catch (error) {
      console.warn('[timings] could not work out the verse timings', error);
      return null;
    }
  })();
  working.set(key, job);
  job.finally(() => working.delete(key));
  return job;
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
