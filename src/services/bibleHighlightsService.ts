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

// ── Highlights made with no connection ────────────────────────────────
// They show straight away, are kept on the device, and are saved to the
// account (in order) as soon as the connection returns.

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
  navigator.onLine === false || /fetch|network|load failed|timed? ?out/i.test(String((error as { message?: string })?.message ?? error));

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
    .in('verse', verses);
  if (clearError) throw clearError;
  const { error } = await supabase
    .from('bible_highlights')
    .insert(verses.map((verse) => ({ user_id: userId, book: apiBook, chapter, verse, highlight_color: color })));
  if (error) throw error;
}

async function applyRemove(userId: string, book: string, chapter: number, verses: number[]) {
  const { error } = await supabase
    .from('bible_highlights')
    .delete()
    .eq('user_id', userId)
    .in('book', bookKeys(book))
    .eq('chapter', chapter)
    .in('verse', verses);
  if (error) throw error;
}

let flushing = false;

export const bibleHighlightsService = {
  async listAll(userId: string): Promise<HighlightRow[]> {
    const { data, error } = await supabase
      .from('bible_highlights')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error && !isConnectionError(error)) throw error;
    return withPending((data || []) as HighlightRow[], userId);
  },

  async listChapter(userId: string, book: string, chapter: number): Promise<HighlightRow[]> {
    const { data, error } = await supabase
      .from('bible_highlights')
      .select('*')
      .eq('user_id', userId)
      .in('book', bookKeys(book))
      .eq('chapter', chapter)
      .order('updated_at', { ascending: false });
    if (error && !isConnectionError(error)) throw error;
    return withPending((data || []) as HighlightRow[], userId, book, chapter);
  },

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
