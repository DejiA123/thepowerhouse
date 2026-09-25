import { bibleBooks } from '@/components/bible/BibleBookList';
import { supabaseAudioService } from '@/services/supabaseAudioService';
import { getVerseTimings } from '@/services/verseTimingService';

/**
 * Offline audio Bible.
 * Chapter MP3s are saved in Cache Storage (persists across app restarts, works
 * in installed PWAs on iOS and Android). Playback uses the saved copy when it
 * exists, so chapters play with no internet connection.
 */

const CACHE_NAME = 'bible-audio-offline-v1';
const INDEX_KEY = 'offline_audio_index_v1';
const CHANGE_EVENT = 'offline-audio:changed';

export interface DownloadedChapter {
  book: string;      // api name, e.g. "john"
  chapter: number;
  version: string;
  url: string;
  bytes: number;
  savedAt: number;
}

export interface BookDownloadProgress {
  book: string;
  done: number;
  total: number;
  failed: number;
  /** Why the last chapter failed, e.g. the device ran out of space. */
  error?: string;
  /** True when the device is out of space; the rest of the download was stopped. */
  outOfSpace?: boolean;
}

/**
 * Phones pause web apps when the screen locks or you switch apps, and the
 * network drops for a moment. Wait for the app to be visible and online again
 * instead of counting those chapters as failed.
 */
function waitUntilActive(signal?: AbortSignal): Promise<void> {
  const active = () => document.visibilityState === 'visible' && navigator.onLine;
  if (active()) return Promise.resolve();
  return new Promise((resolve) => {
    const check = () => {
      if (!active() && !signal?.aborted) return;
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('online', check);
      signal?.removeEventListener('abort', check);
      clearInterval(timer);
      // Give the connection a moment to come back after unlocking
      setTimeout(resolve, 800);
    };
    const timer = setInterval(check, 2000);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('online', check);
    signal?.addEventListener('abort', check);
  });
}

const isQuotaError = (error: unknown) =>
  (error as Error)?.name === 'QuotaExceededError' || /quota|storage/i.test((error as Error)?.message || '');

type Index = Record<string, DownloadedChapter>;

const allBooks = [...bibleBooks['Old Testament'], ...bibleBooks['New Testament']];
export const bookInfo = (apiName: string) => allBooks.find((b) => b.apiName.toLowerCase() === apiName.toLowerCase());

const keyFor = (book: string, chapter: number) => `${book.toLowerCase()}:${chapter}`;

const readIndex = (): Index => {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) || '{}');
  } catch {
    return {};
  }
};

const writeIndex = (index: Index) => {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
};

export const offlineAudioSupported = () => typeof window !== 'undefined' && 'caches' in window;

/** Ask the browser not to evict downloads when space is low. */
async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    /* not supported */
  }
}

const objectUrls = new Map<string, string>();

export const offlineAudioService = {
  CHANGE_EVENT,

  list(): DownloadedChapter[] {
    return Object.values(readIndex()).sort((a, b) => {
      const ia = allBooks.findIndex((x) => x.apiName === a.book);
      const ib = allBooks.findIndex((x) => x.apiName === b.book);
      return ia - ib || a.chapter - b.chapter;
    });
  },

  isDownloaded(book: string, chapter: number) {
    return !!readIndex()[keyFor(book, chapter)];
  },

  bookStatus(book: string) {
    const info = bookInfo(book);
    const total = info?.chapters ?? 0;
    const index = readIndex();
    let done = 0;
    let bytes = 0;
    for (let c = 1; c <= total; c++) {
      const entry = index[keyFor(book, c)];
      if (entry) {
        done++;
        bytes += entry.bytes;
      }
    }
    return { done, total, bytes };
  },

  totalBytes() {
    return Object.values(readIndex()).reduce((sum, e) => sum + e.bytes, 0);
  },

  async storageEstimate(): Promise<{ usage: number; quota: number } | null> {
    try {
      const est = await navigator.storage?.estimate?.();
      return est ? { usage: est.usage ?? 0, quota: est.quota ?? 0 } : null;
    } catch {
      return null;
    }
  },

  /**
   * Returns a playable URL: a local blob URL when the chapter is saved on the
   * device, otherwise the original streaming URL.
   */
  async resolvePlayableUrl(remoteUrl: string): Promise<string> {
    if (!offlineAudioSupported()) return remoteUrl;
    const existing = objectUrls.get(remoteUrl);
    if (existing) return existing;
    try {
      const cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(remoteUrl);
      if (!hit) return remoteUrl;
      const blob = await hit.blob();
      const local = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: 'audio/mpeg' }));
      objectUrls.set(remoteUrl, local);
      return local;
    } catch {
      return remoteUrl;
    }
  },

  async downloadChapter(
    book: string,
    chapter: number,
    version: string,
    onProgress?: (fraction: number) => void,
    signal?: AbortSignal,
  ): Promise<DownloadedChapter> {
    if (!offlineAudioSupported()) throw new Error('Offline downloads are not supported on this browser');
    const url = await supabaseAudioService.getAudioUrl(book, chapter, version);
    if (!url) throw new Error('Audio not available for this chapter');

    const existing = readIndex()[keyFor(book, chapter)];
    if (existing && existing.url === url) return existing;

    const response = await fetch(url, { signal, mode: 'cors' });
    if (!response.ok || !response.body) throw new Error(`Download failed (${response.status})`);

    // Stream so we can report progress on slow connections
    const total = Number(response.headers.get('content-length')) || 0;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.length;
        if (total) onProgress?.(received / total);
      }
    }
    const blob = new Blob(chunks, { type: 'audio/mpeg' });

    const cache = await caches.open(CACHE_NAME);
    await cache.put(url, new Response(blob, { headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': String(blob.size) } }));

    const entry: DownloadedChapter = { book: book.toLowerCase(), chapter, version, url, bytes: blob.size, savedAt: Date.now() };
    const index = readIndex();
    index[keyFor(book, chapter)] = entry;
    writeIndex(index);
    // Save verse timings too, so "follow along" highlighting works offline
    getVerseTimings(book, chapter).catch(() => null);
    onProgress?.(1);
    return entry;
  },

  /** Downloads every chapter of a book (2 at a time), skipping ones already saved. */
  async downloadBook(
    book: string,
    version: string,
    onProgress: (p: BookDownloadProgress) => void,
    signal?: AbortSignal,
  ): Promise<BookDownloadProgress> {
    await requestPersistence();
    const info = bookInfo(book);
    const total = info?.chapters ?? 0;
    const queue = Array.from({ length: total }, (_, i) => i + 1);
    const progress: BookDownloadProgress = { book, done: 0, total, failed: 0 };
    const index = readIndex();
    progress.done = queue.filter((c) => index[keyFor(book, c)]).length;
    onProgress({ ...progress });

    const pending = queue.filter((c) => !index[keyFor(book, c)]);
    const worker = async () => {
      while (pending.length && !signal?.aborted && !progress.outOfSpace) {
        const chapter = pending.shift()!;
        let ok = false;
        let attempts = 0;
        while (!ok && attempts < 3 && !signal?.aborted && !progress.outOfSpace) {
          await waitUntilActive(signal);
          if (signal?.aborted) return;
          try {
            await this.downloadChapter(book, chapter, version, undefined, signal);
            ok = true;
          } catch (error) {
            if ((error as Error).name === 'AbortError' && signal?.aborted) return;
            if (isQuotaError(error)) {
              progress.outOfSpace = true;
              progress.error = 'Your device is out of space for downloads.';
              break;
            }
            // Paused by the phone (locked / switched apps / offline)? Retry without counting it.
            if (document.visibilityState !== 'visible' || !navigator.onLine) continue;
            attempts++;
            progress.error = (error as Error).message;
            if (attempts < 3) await new Promise((r) => setTimeout(r, 1500 * attempts));
          }
        }
        if (ok) progress.done++;
        else if (!signal?.aborted) progress.failed++;
        onProgress({ ...progress });
      }
    };
    await Promise.all([worker(), worker()]);
    return progress;
  },

  async removeChapter(book: string, chapter: number) {
    const index = readIndex();
    const entry = index[keyFor(book, chapter)];
    if (!entry) return;
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(entry.url);
    const local = objectUrls.get(entry.url);
    if (local) {
      URL.revokeObjectURL(local);
      objectUrls.delete(entry.url);
    }
    delete index[keyFor(book, chapter)];
    writeIndex(index);
  },

  async removeBook(book: string) {
    const index = readIndex();
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(
      Object.entries(index)
        .filter(([, e]) => e.book === book.toLowerCase())
        .map(async ([key, e]) => {
          await cache.delete(e.url);
          delete index[key];
        }),
    );
    writeIndex(index);
  },

  async removeAll() {
    await caches.delete(CACHE_NAME);
    objectUrls.forEach((u) => URL.revokeObjectURL(u));
    objectUrls.clear();
    writeIndex({});
  },
};

export const formatBytes = (bytes: number) => {
  if (!bytes) return '0 MB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};
