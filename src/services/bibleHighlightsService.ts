import { supabase } from '@/integrations/supabase/client';
import { normalizeBookApiName } from '@/components/bible/bookUtils';
import { HIGHLIGHTS_CHANGED } from '@/components/bible/highlightColors';

export interface HighlightRow {
  id: string;
  user_id: string;
  book: string;
  chapter: number;
  verse: number | null;
  highlight_color: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const announce = () => window.dispatchEvent(new CustomEvent(HIGHLIGHTS_CHANGED));

/** Book names as they may have been stored (older rows weren't always normalised). */
const bookKeys = (book: string) => Array.from(new Set([normalizeBookApiName(book), book]));

// ── Offline ───────────────────────────────────────────────────────────
// A copy of the account's highlights is kept on the phone (refreshed each time
// they're read online, and when the app starts), so every chapter shows its
// highlights with no connection. Highlights made or removed offline show
// straight away, are queued on the phone, and are saved to the account (in
// order) as soon as the connection returns.

interface PendingChange {
  kind: 'set' | 'remove';
  userId: string;
  book: string;
  chapter: number;
  verses: number[];
  color?: string;
  at: string;
}

const QUEUE_KEY = 'bible_highlights_queue_v1';

const readQueue = (): PendingChange[] => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
};
const writeQueue = (queue: PendingChange[]) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    /* storage full */
  }
};

const isConnectionError = (error: unknown) =>
  navigator.onLine === false || /fetch|network|load failed|abort|timed? ?out/i.test(String((error as { message?: string })?.message ?? error));

/** Give up after this long (a weak signal can hang for minutes): the change is queued instead */
const TIMEOUT_MS = 15_000;
const timeout = () => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), TIMEOUT_MS);
  return controller.signal;
};

// The account's highlights as last seen (not including queued changes)
const cacheKey = (userId: string) => `bible_highlights_cache_v1_${userId}`;
const readCache = (userId: string): HighlightRow[] | null => {
  try {
    return JSON.parse(localStorage.getItem(cacheKey(userId)) || 'null');
  } catch {
    return null;
  }
};
const writeCache = (userId: string, rows: HighlightRow[]) => {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(rows));
  } catch {
    /* storage full */
  }
};
const inChapter = (h: HighlightRow, book: string, chapter: number) =>
  normalizeBookApiName(h.book) === normalizeBookApiName(book) && h.chapter === chapter;

/** A change the account now has: the phone's copy follows */
function cacheChange(userId: string, change: Omit<PendingChange, 'userId'>) {
  const rows = readCache(userId);
  if (!rows) return;
  const apiBook = normalizeBookApiName(change.book);
  const kept = rows.filter((h) => !(inChapter(h, apiBook, change.chapter) && change.verses.includes(h.verse ?? -1)));
  const added = change.kind === 'set'
    ? change.verses.map((verse) => ({
      id: `local-${apiBook}-${change.chapter}-${verse}`,
      user_id: userId, book: apiBook, chapter: change.chapter, verse,
      highlight_color: change.color ?? 'yellow', created_at: change.at, updated_at: change.at,
    }))
    : [];
  writeCache(userId, [...added, ...kept]);
}

/** Show queued changes on top of what the server returned. */
function withPending(rows: HighlightRow[], userId: string, book?: string, chapter?: number): HighlightRow[] {
  let out = rows;
  readQueue()
    .filter((c) => c.userId === userId && (!book || (normalizeBookApiName(c.book) === normalizeBookApiName(book) && c.chapter === chapter)))
    .forEach((c) => {
      const apiBook = normalizeBookApiName(c.book);
      const affected = (h: HighlightRow) => normalizeBookApiName(h.book) === apiBook && h.chapter === c.chapter && c.verses.includes(h.verse ?? -1);
      out = out.filter((h) => !affected(h));
      if (c.kind === 'set') {
        out = [
          ...c.verses.map((verse) => ({
            id: `pending-${apiBook}-${c.chapter}-${verse}`,
            user_id: userId,
            book: apiBook,
            chapter: c.chapter,
            verse,
            highlight_color: c.color ?? 'yellow',
            created_at: c.at,
            updated_at: c.at,
          })),
          ...out,
        ];
      }
    });
  return out;
}

async function applySet(userId: string, book: string, chapter: number, verses: number[], color: string) {
  const apiBook = normalizeBookApiName(book);
  const { error: clearError } = await supabase
    .from('bible_highlights')
    .delete()
    .eq('user_id', userId)
    .in('book', bookKeys(book))
    .eq('chapter', chapter)
    .in('verse', verses)
    .abortSignal(timeout());
  if (clearError) throw clearError;
  const { error } = await supabase
    .from('bible_highlights')
    .insert(verses.map((verse) => ({ user_id: userId, book: apiBook, chapter, verse, highlight_color: color })))
    .abortSignal(timeout());
  if (error) throw error;
  cacheChange(userId, { kind: 'set', book: apiBook, chapter, verses, color, at: new Date().toISOString() });
}

async function applyRemove(userId: string, book: string, chapter: number, verses: number[]) {
  const { error } = await supabase
    .from('bible_highlights')
    .delete()
    .eq('user_id', userId)
    .in('book', bookKeys(book))
    .eq('chapter', chapter)
    .in('verse', verses)
    .abortSignal(timeout());
  if (error) throw error;
  cacheChange(userId, { kind: 'remove', book: normalizeBookApiName(book), chapter, verses, at: new Date().toISOString() });
}

let flushing = false;

export const bibleHighlightsService = {
  /** Every highlight (offline: the copy on this phone), with changes still waiting to be sent */
  async listAll(userId: string): Promise<HighlightRow[]> {
    const { data, error } = await supabase
      .from('bible_highlights')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .abortSignal(timeout())
      .then((r) => r, (e) => ({ data: null, error: e }));
    if (error) {
      if (!isConnectionError(error)) throw error;
      return withPending(readCache(userId) ?? [], userId);
    }
    writeCache(userId, (data || []) as HighlightRow[]);
    return withPending((data || []) as HighlightRow[], userId);
  },

  /** One chapter's highlights (offline: the copy on this phone), with changes still waiting to be sent */
  async listChapter(userId: string, book: string, chapter: number): Promise<HighlightRow[]> {
    const { data, error } = await supabase
      .from('bible_highlights')
      .select('*')
      .eq('user_id', userId)
      .in('book', bookKeys(book))
      .eq('chapter', chapter)
      .order('updated_at', { ascending: false })
      .abortSignal(timeout())
      .then((r) => r, (e) => ({ data: null, error: e }));
    if (error) {
      if (!isConnectionError(error)) throw error;
      const cached = (readCache(userId) ?? []).filter((h) => inChapter(h, book, chapter));
      return withPending(cached, userId, book, chapter);
    }
    const rows = (data || []) as HighlightRow[];
    // Keep the phone's copy of this chapter current
    const cache = readCache(userId);
    writeCache(userId, [...rows, ...(cache ?? []).filter((h) => !inChapter(h, book, chapter))]);
    return withPending(rows, userId, book, chapter);
  },

  /** Fill the phone's copy, so every chapter's highlights are there offline (on start and back online) */
  async refreshCopy(userId: string) {
    if (navigator.onLine === false) return;
    await this.listAll(userId).catch(() => undefined);
  },

  /** Changes made offline still waiting to be sent */
  waiting: () => readQueue().length,

  /**
   * Colour these verses. Any earlier highlight on the same verse is replaced,
   * so a verse never carries two colours. Offline, the change is queued.
   */
  async setColor(userId: string, book: string, chapter: number, verses: number[], color: string) {
    if (!verses.length) return;
    const change: PendingChange = { kind: 'set', userId, book: normalizeBookApiName(book), chapter, verses, color, at: new Date().toISOString() };
    if (navigator.onLine === false || readQueue().length) {
      writeQueue([...readQueue(), change]);
      announce();
      this.flush();
      return;
    }
    try {
      await applySet(userId, book, chapter, verses, color);
    } catch (error) {
      if (!isConnectionError(error)) throw error;
      writeQueue([...readQueue(), change]);
    }
    announce();
  },

  async remove(userId: string, book: string, chapter: number, verses: number[]) {
    if (!verses.length) return;
    const change: PendingChange = { kind: 'remove', userId, book: normalizeBookApiName(book), chapter, verses, at: new Date().toISOString() };
    if (navigator.onLine === false || readQueue().length) {
      writeQueue([...readQueue(), change]);
      announce();
      this.flush();
      return;
    }
    try {
      await applyRemove(userId, book, chapter, verses);
    } catch (error) {
      if (!isConnectionError(error)) throw error;
      writeQueue([...readQueue(), change]);
    }
    announce();
  },

  /** Save queued changes, oldest first. Stops at the first one that can't be sent. */
  async flush() {
    if (flushing || navigator.onLine === false) return;
    flushing = true;
    let sent = 0;
    try {
      for (;;) {
        const [next] = readQueue();
        if (!next) break;
        try {
          if (next.kind === 'set') await applySet(next.userId, next.book, next.chapter, next.verses, next.color ?? 'yellow');
          else await applyRemove(next.userId, next.book, next.chapter, next.verses);
        } catch (error) {
          if (isConnectionError(error)) break;
          console.warn('Dropping a highlight change the server refused', error);
        }
        // Re-read: changes made meanwhile were added to the end
        writeQueue(readQueue().slice(1));
        sent++;
      }
    } finally {
      flushing = false;
      if (sent) announce();
    }
  },
};
