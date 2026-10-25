/**
 * Which chapter plays after (or before) the one that's playing. Book names are
 * matched however they're written ("1 Samuel", "1-samuel", "1sa"), so the move
 * into the next book never silently fails.
 */
import { getAllBooksFlat, normalizeBookApiName } from '@/components/bible/bookUtils';

export interface ChapterPos {
  book: string;
  chapter: number;
  /** Moved into a different book */
  newBook: boolean;
}

const findIndex = (book: string) => {
  const books = getAllBooksFlat();
  const key = normalizeBookApiName(book).toLowerCase();
  return books.findIndex((b) => b.apiName.toLowerCase() === key);
};

/** Null at the end of the Bible (or an unknown book). */
export function nextChapterAfter(book: string, chapter: number, loopBook = false): ChapterPos | null {
  const books = getAllBooksFlat();
  const i = findIndex(book);
  if (i < 0) return null;
  const info = books[i];
  if (chapter < info.chapters) return { book: info.apiName, chapter: chapter + 1, newBook: false };
  if (loopBook) return { book: info.apiName, chapter: 1, newBook: false };
  if (i >= books.length - 1) return null;
  return { book: books[i + 1].apiName, chapter: 1, newBook: true };
}

export function previousChapterBefore(book: string, chapter: number): ChapterPos | null {
  const books = getAllBooksFlat();
  const i = findIndex(book);
  if (i < 0) return null;
  if (chapter > 1) return { book: books[i].apiName, chapter: chapter - 1, newBook: false };
  if (i === 0) return null;
  return { book: books[i - 1].apiName, chapter: books[i - 1].chapters, newBook: true };
}
