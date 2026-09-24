import { supabase } from '@/integrations/supabase/client';
import { bibleBooks } from '@/components/bible/BibleBookList';
import { enhancedApiBibleService } from '@/services/enhancedApiBibleService';

/**
 * "Google for the Bible":
 *  1. Typed references ("jn 3 16", "1cor13", "psalm 23:1-3") resolve instantly on the device.
 *  2. Paraphrases / misquotes / topics go to the `bible-smart-search` edge function,
 *     which returns the references people most likely mean.
 *  3. Plain word matches from the Bible API fill in the rest.
 * Verse text always comes from the real Bible API in the reader's version.
 */

export interface SmartResult {
  key: string;
  book: string;          // api name
  bookName: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  text: string;
  reason?: string;
  confidence?: number;
  source: 'reference' | 'ai' | 'words';
}

const ALL_BOOKS = [...bibleBooks['Old Testament'], ...bibleBooks['New Testament']];

const EXTRA_ALIASES: Record<string, string[]> = {
  genesis: ['gen', 'ge', 'gn'], exodus: ['ex', 'exo', 'exod'], leviticus: ['lev', 'lv'], numbers: ['num', 'nm', 'nb'],
  deuteronomy: ['deut', 'dt', 'deu'], joshua: ['josh', 'jos'], judges: ['judg', 'jdg', 'jg'], ruth: ['rth', 'ru'],
  '1-samuel': ['1sam', '1sa', '1s', 'isam'], '2-samuel': ['2sam', '2sa', '2s', 'iisam'],
  '1-kings': ['1kgs', '1ki', '1k'], '2-kings': ['2kgs', '2ki', '2k'],
  '1-chronicles': ['1chr', '1ch', '1chron'], '2-chronicles': ['2chr', '2ch', '2chron'],
  ezra: ['ezr'], nehemiah: ['neh', 'ne'], esther: ['est', 'esth'], job: ['jb'],
  psalms: ['ps', 'psa', 'psalm', 'pslm', 'psm', 'pss'], proverbs: ['prov', 'pro', 'prv', 'pr'],
  ecclesiastes: ['eccl', 'ecc', 'qoh'], 'song-of-solomon': ['song', 'sos', 'songofsongs', 'song of songs', 'canticles', 'sng'],
  isaiah: ['isa', 'is'], jeremiah: ['jer', 'je'], lamentations: ['lam', 'la'], ezekiel: ['ezek', 'eze', 'ezk'],
  daniel: ['dan', 'da', 'dn'], hosea: ['hos', 'ho'], joel: ['jl'], amos: ['am'], obadiah: ['obad', 'ob'],
  jonah: ['jon', 'jnh'], micah: ['mic', 'mc'], nahum: ['nah', 'na'], habakkuk: ['hab', 'hb'],
  zephaniah: ['zeph', 'zep', 'zp'], haggai: ['hag', 'hg'], zechariah: ['zech', 'zec', 'zc'], malachi: ['mal', 'ml'],
  matthew: ['matt', 'mat', 'mt'], mark: ['mrk', 'mk', 'mr'], luke: ['luk', 'lk'], john: ['jhn', 'jn', 'joh'],
  acts: ['act', 'ac'], romans: ['rom', 'ro', 'rm'], '1-corinthians': ['1cor', '1co', 'icor'], '2-corinthians': ['2cor', '2co', 'iicor'],
  galatians: ['gal', 'ga'], ephesians: ['eph', 'ephes'], philippians: ['phil', 'php', 'pp'], colossians: ['col'],
  '1-thessalonians': ['1thess', '1th', '1thes'], '2-thessalonians': ['2thess', '2th', '2thes'],
  '1-timothy': ['1tim', '1ti', '1tm'], '2-timothy': ['2tim', '2ti', '2tm'], titus: ['tit', 'ti'], philemon: ['philem', 'phm', 'pm'],
  hebrews: ['heb'], james: ['jas', 'jm'], '1-peter': ['1pet', '1pe', '1pt'], '2-peter': ['2pet', '2pe', '2pt'],
  '1-john': ['1jn', '1jo', '1joh'], '2-john': ['2jn', '2jo'], '3-john': ['3jn', '3jo'], jude: ['jud', 'jd'],
  revelation: ['rev', 're', 'rv', 'revelations', 'apocalypse'],
};

const compact = (s: string) => s.toLowerCase().replace(/first\s+/g, '1').replace(/second\s+/g, '2').replace(/third\s+/g, '3')
  .replace(/^iii\s*/, '3').replace(/^ii\s*/, '2').replace(/^i\s+/, '1').replace(/[^a-z0-9]/g, '');

const ALIAS_INDEX: { alias: string; apiName: string }[] = ALL_BOOKS.flatMap((b) => {
  const names = new Set<string>([compact(b.name), compact(b.apiName), ...(EXTRA_ALIASES[b.apiName] || []).map(compact)]);
  return Array.from(names).map((alias) => ({ alias, apiName: b.apiName }));
});

function levenshtein(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

/** Book name (any common spelling, abbreviation or small typo) → api name. */
export function resolveBook(input: string): string | null {
  const key = compact(input);
  if (!key) return null;
  const exact = ALIAS_INDEX.find((a) => a.alias === key);
  if (exact) return exact.apiName;
  // Unique prefix, e.g. "phile" → philemon, "revel" → revelation
  const prefixed = Array.from(new Set(ALIAS_INDEX.filter((a) => a.alias.startsWith(key) && key.length >= 3).map((a) => a.apiName)));
  if (prefixed.length === 1) return prefixed[0];
  // Small typos in longer names: "jermiah", "phillipians", "revalation"
  if (key.length >= 4) {
    let best: { apiName: string; d: number } | null = null;
    for (const a of ALIAS_INDEX) {
      if (a.alias.length < 4) continue;
      const d = levenshtein(key, a.alias);
      if (d <= (key.length > 7 ? 2 : 1) && (!best || d < best.d)) best = { apiName: a.apiName, d };
    }
    if (best) return best.apiName;
  }
  return null;
}

export const bookDisplayName = (apiName: string) => ALL_BOOKS.find((b) => b.apiName === apiName)?.name ?? apiName;

export interface ParsedReference {
  book: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
}

/** "john 3:16", "Jn3 16", "1 cor 13", "psalm 23:1-3", "rom 8 28", "gen 1" */
export function parseReference(query: string): ParsedReference | null {
  const q = query.trim().replace(/\s+/g, ' ');
  const m = q.match(/^((?:[1-3]|i{1,3}|first|second|third)?\s*[a-z][a-z\s.]*?)\s*(\d{1,3})(?:\s*[:.\s]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?)?\s*$/i);
  if (!m) return null;
  const book = resolveBook(m[1]);
  if (!book) return null;
  const info = ALL_BOOKS.find((b) => b.apiName === book);
  const chapter = Number(m[2]);
  if (!info || chapter < 1 || chapter > info.chapters) {
    // Single-chapter books: "jude 5" means Jude 1:5
    if (info && info.chapters === 1 && !m[3]) return { book, chapter: 1, verseStart: chapter, verseEnd: chapter };
    return null;
  }
  const verseStart = m[3] ? Number(m[3]) : undefined;
  const verseEnd = m[4] ? Math.max(Number(m[4]), verseStart ?? 0) : verseStart;
  return { book, chapter, verseStart, verseEnd };
}

async function versesFor(version: string, book: string, chapter: number, start?: number, end?: number) {
  const data = await enhancedApiBibleService.getChapter(version, book, chapter).catch(() => null);
  if (!data?.verses?.length) return null;
  const s = start ?? 1;
  const e = end ?? (start ? start : Math.min(3, data.verses.length));
  const chosen = data.verses.filter((v: any, i: number) => {
    const n = Number(v.verse) || i + 1;
    return n >= s && n <= e;
  });
  if (!chosen.length) return null;
  return chosen.map((v: any) => String(v.text || '').replace(/\s+/g, ' ').trim()).join(' ');
}

const keyOf = (book: string, chapter: number, start: number, end: number) => `${book}:${chapter}:${start}-${end}`;

export async function referenceResult(ref: ParsedReference, version: string): Promise<SmartResult | null> {
  const start = ref.verseStart ?? 1;
  const end = ref.verseEnd ?? (ref.verseStart ? ref.verseStart : start + 2);
  const text = await versesFor(version, ref.book, ref.chapter, ref.verseStart ? start : undefined, ref.verseStart ? end : undefined);
  if (!text) return null;
  return {
    key: keyOf(ref.book, ref.chapter, start, end),
    book: ref.book,
    bookName: bookDisplayName(ref.book),
    chapter: ref.chapter,
    verseStart: ref.verseStart ?? 0,
    verseEnd: ref.verseEnd ?? 0,
    text,
    source: 'reference',
  };
}

/** Ask the edge function what passages the person means, then load their real text. */
const AI_CACHE_KEY = 'bible_ai_search_cache_v1';

function readAiCache(): Record<string, { at: number; results: any[] }> {
  try {
    return JSON.parse(localStorage.getItem(AI_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeAiCache(query: string, results: any[]) {
  try {
    const cache = readAiCache();
    cache[query] = { at: Date.now(), results };
    const entries = Object.entries(cache).sort((a, b) => b[1].at - a[1].at).slice(0, 150);
    localStorage.setItem(AI_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    /* storage full */
  }
}

export async function aiResults(query: string, version: string, signal?: AbortSignal): Promise<SmartResult[]> {
  const cacheKey = query.trim().toLowerCase().replace(/\s+/g, ' ');
  let references: any[] | null = readAiCache()[cacheKey]?.results ?? null;
  if (!references) {
    const { data, error } = await supabase.functions.invoke('bible-smart-search', { body: { query } });
    if (error || !Array.isArray(data?.results) || signal?.aborted) return [];
    references = data.results as any[];
    if (references.length) writeAiCache(cacheKey, references);
  }
  const loaded = await Promise.all(
    references.map(async (r) => {
      const book = resolveBook(String(r.book || ''));
      if (!book) return null;
      const start = Number(r.verse_start) || 1;
      const end = Math.min(Math.max(Number(r.verse_end) || start, start), start + 6);
      const text = await versesFor(version, book, Number(r.chapter), start, end);
      if (!text) return null; // reference doesn't exist → dropped
      return {
        key: keyOf(book, Number(r.chapter), start, end),
        book,
        bookName: bookDisplayName(book),
        chapter: Number(r.chapter),
        verseStart: start,
        verseEnd: end,
        text,
        reason: r.reason,
        confidence: r.confidence,
        source: 'ai' as const,
      };
    }),
  );
  return loaded.filter(Boolean) as SmartResult[];
}

const API_BOOK_IDS: Record<string, string> = {
  GEN: 'genesis', EXO: 'exodus', LEV: 'leviticus', NUM: 'numbers', DEU: 'deuteronomy', JOS: 'joshua', JDG: 'judges', RUT: 'ruth',
  '1SA': '1-samuel', '2SA': '2-samuel', '1KI': '1-kings', '2KI': '2-kings', '1CH': '1-chronicles', '2CH': '2-chronicles',
  EZR: 'ezra', NEH: 'nehemiah', EST: 'esther', JOB: 'job', PSA: 'psalms', PRO: 'proverbs', ECC: 'ecclesiastes',
  SNG: 'song-of-solomon', ISA: 'isaiah', JER: 'jeremiah', LAM: 'lamentations', EZK: 'ezekiel', DAN: 'daniel', HOS: 'hosea',
  JOL: 'joel', AMO: 'amos', OBA: 'obadiah', JON: 'jonah', MIC: 'micah', NAM: 'nahum', HAB: 'habakkuk', ZEP: 'zephaniah',
  HAG: 'haggai', ZEC: 'zechariah', MAL: 'malachi', MAT: 'matthew', MRK: 'mark', LUK: 'luke', JHN: 'john', ACT: 'acts',
  ROM: 'romans', '1CO': '1-corinthians', '2CO': '2-corinthians', GAL: 'galatians', EPH: 'ephesians', PHP: 'philippians',
  COL: 'colossians', '1TH': '1-thessalonians', '2TH': '2-thessalonians', '1TI': '1-timothy', '2TI': '2-timothy', TIT: 'titus',
  PHM: 'philemon', HEB: 'hebrews', JAS: 'james', '1PE': '1-peter', '2PE': '2-peter', '1JN': '1-john', '2JN': '2-john',
  '3JN': '3-john', JUD: 'jude', REV: 'revelation',
};

/** Verses containing the words typed (existing API search). */
export async function wordResults(query: string, version: string): Promise<SmartResult[]> {
  const verses = await enhancedApiBibleService.search(version, query).catch(() => []);
  return verses.slice(0, 40).map((v: any) => {
    const raw = String(v.book || '');
    const book = API_BOOK_IDS[raw.toUpperCase()] || resolveBook(raw) || raw.toLowerCase();
    const n = Number(v.verse) || 1;
    return {
      key: keyOf(book, Number(v.chapter), n, n),
      book,
      bookName: bookDisplayName(book),
      chapter: Number(v.chapter),
      verseStart: n,
      verseEnd: n,
      text: String(v.text || '').replace(/\s+/g, ' ').trim(),
      source: 'words' as const,
    };
  });
}

export const formatRef = (r: Pick<SmartResult, 'bookName' | 'chapter' | 'verseStart' | 'verseEnd'>) =>
  `${r.bookName} ${r.chapter}${r.verseStart ? `:${r.verseStart}${r.verseEnd && r.verseEnd !== r.verseStart ? `–${r.verseEnd}` : ''}` : ''}`;
