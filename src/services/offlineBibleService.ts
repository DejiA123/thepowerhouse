/**
 * "Read offline": saves Bible text on the device so every downloaded chapter
 * opens with no internet connection.
 *
 * Every translation downloads as one file, so the whole Bible arrives in a
 * single request and never touches the shared API.Bible quota:
 * - public-domain translations (KJV, ASV, WEB, BSB…) from the Free Use Bible API
 * - NIV, NLT, ESV, NKJV, NASB, AMP and MSG from Bolls.life, where the app reads them
 * Anything else downloads a book at a time.
 */
import { strFromU8, unzipSync } from 'fflate';
import { getAllBooksFlat } from '@/components/bible/bookUtils';
import type { BibleChapter } from '@/types/bible';
import { enhancedApiBibleService, offlineBibleText, OFFLINE_TEXT_MANIFEST } from './enhancedApiBibleService';

export const OFFLINE_TEXT_EVENT = 'offline-bible-text-changed';

/** API.Bible id (before the dash) → Free Use Bible API translation */
const FREE_USE_IDS: Record<string, string> = {
  de4e12af7f28f599: 'eng_kjv', // King James Version
  '06125adad2d5898a': 'eng_asv', // American Standard Version
  f421fe261da7624f: 'eng_asv',
  '685d1470fe4d5c3b': 'eng_abt', // ASV Byzantine Text
  bba9f40183526463: 'BSB', // Berean Standard Bible
  '6bab4d6c61b31b80': 'eng_boy', // Brenton Septuagint (updated)
  '65bfdebd704a8324': 'eng_bre', // Brenton Septuagint
  '55212e3cf5d04d49': 'eng_cpb', // KJV Cambridge Paragraph
  '179568874c45066f': 'eng_dra', // Douay-Rheims
  '55ec700d9e0d77ea': 'eng_emtv', // English Majority Text
  '65eec8e0b60e656b': 'eng_fbv', // Free Bible Version
  c315fa9f71d4af3a: 'eng_gnv', // Geneva Bible
  bf8f1c7f3f9045a5: 'eng_jps', // JPS Tanakh
  '01b29f4b342acc35': 'eng_lsv', // Literal Standard Version
  '40072c4a5aba4022': 'eng_rv5', // Revised Version
  ec290b5045ff54a5: 'eng_oke', // Targum Onkelos
  '2f0fd81d7b85b923': 'eng_f35', // Family 35 NT
  c89622d31b60c444: 'eng_ojb', // Orthodox Jewish Bible
  '32339cf2f720ff8e': 'eng_tce', // Text-Critical English NT
  '66c22495370cdfc0': 'eng_t4t', // Translation for Translators
  '9879dbb7cfe39e4d': 'ENGWEBP', // World English Bible
  '32664dc3288a28df': 'ENGWEBP',
  '7142879509583d59': 'eng_webpb', // WEB British Edition
  '72f4e6dc683324df': 'eng_webu', // WEB Updated
  f72b840c855f362c: 'eng_wmb', // World Messianic Bible
  '04da588535d2f823': 'eng_wmu', // World Messianic Bible British Edition
};

export type WholeBibleSource = { kind: 'free-use'; id: string } | { kind: 'bolls'; code: string };

const BOOKS = getAllBooksFlat();
export const TOTAL_CHAPTERS = BOOKS.reduce((n, b) => n + b.chapters, 0);
/** Standard book codes, in the same order as the app's book list */
const USFM = [
  'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA', '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH', 'EST', 'JOB',
  'PSA', 'PRO', 'ECC', 'SNG', 'ISA', 'JER', 'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO', 'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP',
  'HAG', 'ZEC', 'MAL', 'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI',
  '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV',
];
const BOOK_BY_USFM = new Map(USFM.map((code, i) => [code, BOOKS[i]]));

type Manifest = Record<string, { books: Record<string, true>; whole?: boolean; at?: string }>;

const readManifest = (): Manifest => {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_TEXT_MANIFEST) || '{}');
  } catch {
    return {};
  }
};
const writeManifest = (m: Manifest) => {
  try {
    localStorage.setItem(OFFLINE_TEXT_MANIFEST, JSON.stringify(m));
  } catch {
    /* ignore */
  }
};
const markBooks = (version: string, books: string[], downloaded: boolean, whole = false) => {
  const m = readManifest();
  const entry = (m[version] ??= { books: {} });
  books.forEach((b) => {
    if (downloaded) entry.books[b] = true;
    else delete entry.books[b];
  });
  entry.whole = downloaded ? entry.whole || whole : false;
  entry.at = new Date().toISOString();
  if (!Object.keys(entry.books).length) delete m[version];
  writeManifest(m);
};

// ── Jobs that keep running when the sheet is closed ────────────────────

export interface TextJob {
  /** "all" for the whole Bible, otherwise a book id */
  scope: string;
  version: string;
  phase: 'waiting' | 'downloading' | 'saving';
  done: number;
  total: number;
  failed: number;
  controller: AbortController;
}

const jobs = new Map<string, TextJob>();
const jobKey = (version: string, scope: string) => `${version}|${scope}`;
const emit = () => window.dispatchEvent(new CustomEvent(OFFLINE_TEXT_EVENT));

/** "Download every translation": the queue and where it's up to */
let batch: { versions: { id: string; label: string }[]; index: number; failed: string[]; cancelled: boolean } | null = null;

/** Plain verse text from the Free Use Bible API's verse content */
const verseText = (content: unknown[]): string =>
  content
    .map((c) => (typeof c === 'string' ? c : c && typeof c === 'object' && 'text' in c ? String((c as { text: unknown }).text) : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

interface FreeUseBible {
  books: { id: string; chapters: { chapter: { number: number; content: { type: string; number?: number; content?: unknown[] }[] } }[] }[];
}
interface BollsVerse {
  book: number;
  chapter: number;
  verse: number;
  text: string;
}

const chapterRecord = (version: string, apiName: string, name: string, chapter: number, verses: { verse: number; text: string }[]): BibleChapter => {
  const list = verses.map((v) => ({ book: apiName, chapter, verse: String(v.verse), text: v.text }));
  return { book: apiName, chapter, verses: list, text: list.map((v) => v.text).join(' '), reference: `${name} ${chapter}`, version };
};

/** Every chapter of a translation, from its single download file */
async function fetchWholeBible(version: string, source: WholeBibleSource, signal: AbortSignal): Promise<BibleChapter[]> {
  const out: BibleChapter[] = [];
  if (source.kind === 'free-use') {
    const res = await fetch(`https://bible.helloao.org/api/${source.id}/complete.json`, { signal });
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    const data = (await res.json()) as FreeUseBible;
    data.books.forEach((b) => {
      const book = BOOK_BY_USFM.get(b.id);
      if (!book) return; // Apocrypha and other extra books
      b.chapters.forEach(({ chapter }) => {
        const verses = chapter.content
          .filter((item) => item.type === 'verse' && item.number)
          .map((item) => ({ verse: item.number!, text: verseText(item.content || []) }));
        if (verses.length) out.push(chapterRecord(version, book.apiName, book.name, chapter.number, verses));
      });
    });
  } else {
    const res = await fetch(`https://bolls.life/static/translations/${source.code}.zip`, { signal });
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    const files = unzipSync(new Uint8Array(await res.arrayBuffer()));
    const json = Object.values(files)[0];
    if (!json) throw new Error('Empty download');
    const verses = JSON.parse(strFromU8(json)) as BollsVerse[];
    const chapters = new Map<string, { book: (typeof BOOKS)[number]; chapter: number; verses: { verse: number; text: string }[] }>();
    verses.forEach((v) => {
      const book = BOOKS[v.book - 1];
      if (!book || v.book > 66 || !v.verse) return; // verse 0 holds titles
      const key = `${v.book}:${v.chapter}`;
      if (!chapters.has(key)) chapters.set(key, { book, chapter: v.chapter, verses: [] });
      chapters.get(key)!.verses.push({ verse: v.verse, text: enhancedApiBibleService.cleanBollsText(v.text, source.code) });
    });
    chapters.forEach((c) => out.push(chapterRecord(version, c.book.apiName, c.book.name, c.chapter, c.verses.sort((a, b) => a.verse - b.verse))));
  }
  return out;
}

export const offlineBibleService = {
  /** Where a translation's whole-Bible file comes from, or null if it downloads book by book. */
  wholeBibleSource(version: string): WholeBibleSource | null {
    const bolls = enhancedApiBibleService.bollsCodeFor(version);
    if (bolls) return { kind: 'bolls', code: bolls };
    const id = FREE_USE_IDS[version.split('-')[0]];
    return id ? { kind: 'free-use', id } : null;
  },

  downloadedBooks(version: string): Set<string> {
    return new Set(Object.keys(readManifest()[version]?.books ?? {}));
  },

  /** The whole translation is on this device */
  isWhole(version: string): boolean {
    const entry = readManifest()[version];
    return !!entry?.whole || BOOKS.every((b) => entry?.books?.[b.apiName]);
  },

  job(version: string, scope: string): TextJob | undefined {
    return jobs.get(jobKey(version, scope));
  },

  cancel(version: string, scope: string) {
    jobs.get(jobKey(version, scope))?.controller.abort();
  },

  /** The whole Bible from its single file, saved chapter by chapter. */
  async downloadWholeBible(version: string): Promise<{ ok: boolean; message?: string }> {
    const source = this.wholeBibleSource(version);
    if (!source) return { ok: false, message: 'This translation downloads a book at a time.' };
    const key = jobKey(version, 'all');
    if (jobs.has(key)) return { ok: false };
    const job: TextJob = { scope: 'all', version, phase: 'downloading', done: 0, total: TOTAL_CHAPTERS, failed: 0, controller: new AbortController() };
    jobs.set(key, job);
    emit();
    try {
      const chapters = await fetchWholeBible(version, source, job.controller.signal);
      if (!chapters.length) throw new Error('Nothing to save');
      job.phase = 'saving';
      job.total = chapters.length;
      emit();
      let lastEmit = 0;
      for (let i = 0; i < chapters.length; i += 25) {
        if (job.controller.signal.aborted) return { ok: false };
        await Promise.all(
          chapters.slice(i, i + 25).map((c) =>
            offlineBibleText.save(version, c.book, c.chapter, c).then(() => {
              job.done++;
            }),
          ),
        );
        if (Date.now() - lastEmit > 120) {
          lastEmit = Date.now();
          emit();
        }
      }
      // Saving can fail quietly when the phone is full: check the last chapter made it
      const last = chapters[chapters.length - 1];
      if (!(await offlineBibleText.load(version, last.book, last.chapter))?.verses?.length) {
        return { ok: false, message: 'Not enough space on this phone. Free up some space and try again.' };
      }
      markBooks(version, [...new Set(chapters.map((c) => c.book))], true, true);
      return { ok: true };
    } catch (error) {
      if (job.controller.signal.aborted) return { ok: false };
      console.error('Whole Bible download failed', error);
      const quota = error instanceof DOMException && error.name === 'QuotaExceededError';
      return { ok: false, message: quota ? 'Not enough space on this phone.' : 'Check your connection and try again.' };
    } finally {
      jobs.delete(key);
      emit();
    }
  },

  /** Every translation in the list, one after another. */
  batch() {
    return batch;
  },

  async downloadMany(versions: { id: string; label: string }[]): Promise<{ done: number; failed: string[] }> {
    if (batch) return { done: 0, failed: [] };
    const queue = versions.filter((v) => this.wholeBibleSource(v.id) && !this.isWhole(v.id));
    batch = { versions: queue, index: 0, failed: [], cancelled: false };
    emit();
    try {
      for (; batch.index < queue.length && !batch.cancelled; batch.index++) {
        emit();
        const result = await this.downloadWholeBible(queue[batch.index].id);
        if (!result.ok && !batch.cancelled) batch.failed.push(queue[batch.index].label);
        if (result.message?.startsWith('Not enough space')) break;
      }
      return { done: queue.length - batch.failed.length, failed: batch.failed };
    } finally {
      batch = null;
      emit();
    }
  },

  cancelMany() {
    if (!batch) return;
    batch.cancelled = true;
    const current = batch.versions[batch.index];
    if (current) this.cancel(current.id, 'all');
  },

  /** One book, chapter by chapter, from the translation's usual source. */
  async downloadBook(version: string, book: string): Promise<{ ok: boolean; failed: number }> {
    const info = BOOKS.find((b) => b.apiName === book);
    const key = jobKey(version, book);
    if (!info || jobs.has(key)) return { ok: false, failed: 0 };
    const job: TextJob = { scope: book, version, phase: 'saving', done: 0, total: info.chapters, failed: 0, controller: new AbortController() };
    jobs.set(key, job);
    emit();
    try {
      const chapters = Array.from({ length: info.chapters }, (_, i) => i + 1);
      // Two at a time: quick, and gentle on the free Bible services
      for (let i = 0; i < chapters.length; i += 2) {
        if (job.controller.signal.aborted) return { ok: false, failed: job.failed };
        await Promise.all(
          chapters.slice(i, i + 2).map(async (c) => {
            const existing = await offlineBibleText.load(version, book, c);
            const data = existing?.verses?.length ? existing : await enhancedApiBibleService.getChapterOnline(version, book, c).catch(() => null);
            if (data?.verses?.length) {
              if (!existing) await offlineBibleText.save(version, book, c, data);
            } else job.failed++;
            job.done++;
            emit();
          }),
        );
      }
      if (!job.failed) markBooks(version, [book], true);
      return { ok: !job.failed, failed: job.failed };
    } finally {
      jobs.delete(key);
      emit();
    }
  },

  /** Remove downloaded text (one book, or everything for this translation). */
  async remove(version: string, book?: string) {
    const books = book ? BOOKS.filter((b) => b.apiName === book) : BOOKS;
    for (const b of books) {
      await Promise.all(Array.from({ length: b.chapters }, (_, i) => offlineBibleText.remove(version, b.apiName, i + 1)));
    }
    markBooks(version, books.map((b) => b.apiName), false);
    emit();
  },
};
