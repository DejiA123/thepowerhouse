/**
 * Bible text saved on this device.
 *
 * Downloaded books ("Read offline") are kept as one entry per book: 66 per
 * translation. They used to be one entry per chapter, 1,189 per translation
 * (about 40,000 with every translation), and a store that size made the
 * browser's saved files slow to open, which slowed the whole app's start on
 * phones and tablets, because the app itself loads from the same place.
 * Chapters read online are still kept one by one; there are only as many as
 * someone reads.
 */
import type { BibleChapter } from '@/types/bible';
import { getAllBooksFlat } from '@/components/bible/bookUtils';

/** Books downloaded for offline reading, per translation: { [version]: { books: { [book]: true } } } */
export const OFFLINE_TEXT_MANIFEST = 'bible_text_downloads_v1';

/** Chapters read online, one entry each */
const CHAPTERS_CACHE = 'bible-text-chapters-v2';
/** Downloaded books, one entry each */
const BOOKS_CACHE = 'bible-text-books-v1';
/** The old store: every chapter on its own, downloads included (see packDownloadedText) */
const LEGACY_CACHE = 'bible-text-offline-v1';
const PACKED_FLAG = 'bible_text_packed_v1';

const enc = encodeURIComponent;
const chapterKey = (version: string, book: string, chapter: number) =>
  `/offline-text/${enc(version)}/${enc(book.toLowerCase())}/${chapter}`;
const bookKey = (version: string, book: string) => `/offline-text-book/${enc(version)}/${enc(book.toLowerCase())}`;

/** A downloaded book: chapter number → chapter */
type BookPack = Record<string, BibleChapter>;
type Manifest = Record<string, { books?: Record<string, true> } | undefined>;

const supported = () => typeof window !== 'undefined' && 'caches' in window;

const readManifest = (): Manifest => {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_TEXT_MANIFEST) || '{}');
  } catch {
    return {};
  }
};

const packed = () => {
  try {
    return localStorage.getItem(PACKED_FLAG) === '1';
  } catch {
    return false;
  }
};

export const isBookDownloaded = (version: string, book: string) => !!readManifest()[version]?.books?.[book.toLowerCase()];

const json = (data: unknown) => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });

async function readJson<T>(cacheName: string, key: string): Promise<T | null> {
  const hit = await (await caches.open(cacheName)).match(key);
  return hit ? ((await hit.json()) as T) : null;
}

// The last few books opened stay in memory: reading goes chapter by chapter
const packs = new Map<string, Promise<BookPack | null>>();
const rememberPack = (key: string, pack: Promise<BookPack | null>) => {
  packs.delete(key);
  packs.set(key, pack);
  while (packs.size > 3) packs.delete(packs.keys().next().value as string);
};

function loadPack(version: string, book: string): Promise<BookPack | null> {
  const key = bookKey(version, book);
  const pack = packs.get(key) ?? readJson<BookPack>(BOOKS_CACHE, key).catch(() => null);
  rememberPack(key, pack);
  return pack;
}

export const offlineBibleText = {
  /** A saved chapter: from its downloaded book, or read online before. */
  async load(version: string, book: string, chapter: number): Promise<BibleChapter | null> {
    if (!supported()) return null;
    try {
      if (isBookDownloaded(version, book)) {
        const hit = (await loadPack(version, book))?.[chapter];
        if (hit) return hit;
      }
      const key = chapterKey(version, book, chapter);
      const saved = await readJson<BibleChapter>(CHAPTERS_CACHE, key);
      if (saved) return saved;
      // Not moved over from the old store yet
      return packed() ? null : await readJson<BibleChapter>(LEGACY_CACHE, key);
    } catch {
      return null;
    }
  },

  /** A chapter read online, kept so it opens with no connection next time. */
  async save(version: string, book: string, chapter: number, data: BibleChapter & { savedAt?: number }) {
    if (!supported()) return;
    try {
      await (await caches.open(CHAPTERS_CACHE)).put(chapterKey(version, book, chapter), json(data));
    } catch {
      /* storage full */
    }
  },

  /** A whole downloaded book as one entry. False when it couldn't be saved (device full). */
  async saveBook(version: string, book: string, chapters: BibleChapter[]): Promise<boolean> {
    if (!supported()) return false;
    const pack: BookPack = {};
    chapters.forEach((c) => {
      pack[c.chapter] = c;
    });
    const key = bookKey(version, book);
    try {
      await (await caches.open(BOOKS_CACHE)).put(key, json(pack));
      rememberPack(key, Promise.resolve(pack));
      return true;
    } catch (error) {
      console.warn(`Couldn't save ${book} for offline reading`, error);
      packs.delete(key);
      return false;
    }
  },

  /** Remove a book's saved text: the download and any chapters read online. */
  async removeBook(version: string, book: string, chapterCount: number) {
    if (!supported()) return;
    const key = bookKey(version, book);
    packs.delete(key);
    try {
      await (await caches.open(BOOKS_CACHE)).delete(key);
      for (const name of packed() ? [CHAPTERS_CACHE] : [CHAPTERS_CACHE, LEGACY_CACHE]) {
        const cache = await caches.open(name);
        await Promise.all(Array.from({ length: chapterCount }, (_, i) => cache.delete(chapterKey(version, book, i + 1))));
      }
    } catch {
      /* ignore */
    }
  },
};

/** Let the app breathe between steps: this runs in the background. */
const pause = (ms = 40) => new Promise((resolve) => setTimeout(resolve, ms));

let packing = false;

/**
 * One-time move from the old store (every chapter on its own) to one entry per
 * downloaded book, then the old store is removed in one go. Runs quietly in
 * the background after the app has opened; reading works throughout, since
 * either copy is found. If the app is closed part way, it carries on next time.
 */
export async function packDownloadedText() {
  if (!supported() || packed() || packing) return;
  packing = true;
  try {
    if (await caches.has(LEGACY_CACHE)) {
      const legacy = await caches.open(LEGACY_CACHE);
      const books = await caches.open(BOOKS_CACHE);
      const all = getAllBooksFlat();
      const manifest = readManifest();

      for (const [version, entry] of Object.entries(manifest)) {
        for (const book of Object.keys(entry?.books ?? {})) {
          const info = all.find((b) => b.apiName === book);
          if (!info || (await books.match(bookKey(version, book)))) continue;
          const chapters: BibleChapter[] = [];
          for (let c = 1; c <= info.chapters; c++) {
            const hit = await legacy.match(chapterKey(version, book, c));
            if (hit) chapters.push({ ...((await hit.json()) as BibleChapter), chapter: c });
          }
          // Removed in the meantime: nothing to keep
          if (!isBookDownloaded(version, book)) continue;
          // Device full: leave everything as it is and try again next time
          if (chapters.length && !(await offlineBibleText.saveBook(version, book, chapters))) return;
          await pause();
        }
      }

      // Chapters read online (not part of a download) move to their new store...
      const reads = await caches.open(CHAPTERS_CACHE);
      const keys = await legacy.keys();
      for (let i = 0; i < keys.length; i++) {
        const [, , version, book] = new URL(keys[i].url).pathname.split('/').map(decodeURIComponent);
        if (version && book && manifest[version]?.books?.[book]) continue;
        const hit = await legacy.match(keys[i]);
        if (hit) await reads.put(keys[i], hit);
        if (i % 50 === 49) await pause();
      }
      // ...and the old store goes in one go (far quicker than one chapter at a time)
      await caches.delete(LEGACY_CACHE);
    }
    localStorage.setItem(PACKED_FLAG, '1');
    console.log('📖 Downloaded Bible text packed one entry per book');
  } catch (error) {
    console.warn('Packing downloaded Bible text will be tried again next time', error);
  } finally {
    packing = false;
  }
}
