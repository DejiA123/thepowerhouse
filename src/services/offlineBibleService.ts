/**
 * "Read offline": saves Bible text on the device so every downloaded chapter
 * opens with no internet connection.
 *
 * Public-domain translations (KJV, ASV, WEB, BSB…) download as one file from
 * the Free Use Bible API, so the whole Bible arrives in a single request and
 * never touches the shared API.Bible quota. Other translations download a
 * book at a time.
 */
import { getAllBooksFlat } from '@/components/bible/bookUtils';
import type { BibleChapter } from '@/types/bible';
import { enhancedApiBibleService, offlineBibleText, OFFLINE_TEXT_MANIFEST } from './enhancedApiBibleService';

export const OFFLINE_TEXT_EVENT = 'offline-bible-text-changed';

/** App translation (by abbreviation) → complete-Bible file */
const WHOLE_BIBLE: Record<string, { id: string; approxMb: number }> = {
  KJV: { id: 'eng_kjv', approxMb: 2 },
  ASV: { id: 'eng_asv', approxMb: 2 },
  WEB: { id: 'ENGWEBP', approxMb: 2 },
  BSB: { id: 'BSB', approxMb: 2 },
  BBE: { id: 'eng_bbe', approxMb: 2 },
  DARBY: { id: 'eng_dby', approxMb: 2 },
  DBY: { id: 'eng_dby', approxMb: 2 },
  GNV: { id: 'eng_gnv', approxMb: 2 },
  LSV: { id: 'eng_lsv', approxMb: 2 },
};

const BOOKS = getAllBooksFlat();
export const TOTAL_CHAPTERS = BOOKS.reduce((n, b) => n + b.chapters, 0);

type Manifest = Record<string, { books: Record<string, true>; at?: string }>;

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
const markBooks = (version: string, books: string[], downloaded: boolean) => {
  const m = readManifest();
  const entry = (m[version] ??= { books: {} });
  books.forEach((b) => {
    if (downloaded) entry.books[b] = true;
    else delete entry.books[b];
  });
  entry.at = new Date().toISOString();
  if (!Object.keys(entry.books).length) delete m[version];
  writeManifest(m);
};

// ── Jobs that keep running when the sheet is closed ────────────────────

export interface TextJob {
  /** "all" for the whole Bible, otherwise a book id */
  scope: string;
  version: string;
  phase: 'downloading' | 'saving';
  done: number;
  total: number;
  failed: number;
  controller: AbortController;
}

const jobs = new Map<string, TextJob>();
const jobKey = (version: string, scope: string) => `${version}|${scope}`;
const emit = () => window.dispatchEvent(new CustomEvent(OFFLINE_TEXT_EVENT));

/** Plain verse text from the Free Use Bible API's verse content */
const verseText = (content: unknown[]): string =>
  content
    .map((c) => (typeof c === 'string' ? c : c && typeof c === 'object' && 'text' in c ? String((c as { text: unknown }).text) : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

interface CompleteBible {
  books: { order: number; chapters: { chapter: { number: number; content: { type: string; number?: number; content?: unknown[] }[] } }[] }[];
}

async function saveInBatches(items: (() => Promise<void>)[], onStep: () => void, signal: AbortSignal) {
  for (let i = 0; i < items.length; i += 25) {
    if (signal.aborted) return;
    await Promise.all(items.slice(i, i + 25).map((fn) => fn().then(onStep)));
  }
}

export const offlineBibleService = {
  /** Can this translation download the whole Bible in one go? */
  wholeBibleFile(abbreviation?: string) {
    return abbreviation ? WHOLE_BIBLE[abbreviation.toUpperCase()] ?? null : null;
  },

  downloadedBooks(version: string): Set<string> {
    return new Set(Object.keys(readManifest()[version]?.books ?? {}));
  },

  job(version: string, scope: string): TextJob | undefined {
    return jobs.get(jobKey(version, scope));
  },

  anyJob(version: string): boolean {
    return [...jobs.values()].some((j) => j.version === version);
  },

  cancel(version: string, scope: string) {
    jobs.get(jobKey(version, scope))?.controller.abort();
  },

  /** The whole Bible from its single file, saved chapter by chapter. */
  async downloadWholeBible(version: string, abbreviation: string): Promise<{ ok: boolean; message?: string }> {
    const file = this.wholeBibleFile(abbreviation);
    if (!file) return { ok: false, message: 'This translation downloads a book at a time.' };
    const key = jobKey(version, 'all');
    if (jobs.has(key)) return { ok: false };
    const job: TextJob = { scope: 'all', version, phase: 'downloading', done: 0, total: TOTAL_CHAPTERS, failed: 0, controller: new AbortController() };
    jobs.set(key, job);
    emit();
    try {
      const res = await fetch(`https://bible.helloao.org/api/${file.id}/complete.json`, { signal: job.controller.signal });
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const data = (await res.json()) as CompleteBible;
      job.phase = 'saving';
      emit();
      const saves: (() => Promise<void>)[] = [];
      const savedBooks: string[] = [];
      data.books.forEach((b) => {
        const book = BOOKS[b.order - 1];
        if (!book) return;
        savedBooks.push(book.apiName);
        b.chapters.forEach(({ chapter }) => {
          const verses = chapter.content
            .filter((item) => item.type === 'verse' && item.number)
            .map((item) => ({ book: book.apiName, chapter: chapter.number, verse: String(item.number), text: verseText(item.content || []) }));
          const record: BibleChapter = {
            book: book.apiName,
            chapter: chapter.number,
            verses,
            text: verses.map((v) => v.text).join(' '),
            reference: `${book.name} ${chapter.number}`,
            version,
          };
          saves.push(() => offlineBibleText.save(version, book.apiName, chapter.number, record));
        });
      });
      let lastEmit = 0;
      await saveInBatches(
        saves,
        () => {
          job.done++;
          if (Date.now() - lastEmit > 120) {
            lastEmit = Date.now();
            emit();
          }
        },
        job.controller.signal,
      );
      if (job.controller.signal.aborted) return { ok: false };
      // Saving can fail quietly when the phone is full: check the last chapter made it
      if (!(await offlineBibleText.load(version, 'revelation', 22))?.verses?.length) {
        return { ok: false, message: 'Not enough space on this phone. Free up some space and try again.' };
      }
      markBooks(version, savedBooks, true);
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
