/**
 * Tyndale Open Study Notes — verse-by-verse study notes and book
 * introductions from Tyndale House Publishers, released under CC BY-SA 4.0.
 * Served as JSON by the Free Use Bible API (bible.helloao.org).
 */
import { normalizeBookApiName } from '@/components/bible/bookUtils';

const BASE = 'https://bible.helloao.org/api/c/tyndale';

export const STUDY_NOTES_ATTRIBUTION = {
  name: 'Tyndale Open Study Notes',
  holder: 'Tyndale House Publishers',
  website: 'https://tyndaleopenresources.com/',
  license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
};

/** App book id → Tyndale book id. Judges and Jude are checked by chapter count (see below). */
const BOOK_IDS: Record<string, string[]> = {
  genesis: ['GEN'], exodus: ['EXO'], leviticus: ['LEV'], numbers: ['NUM'], deuteronomy: ['DEU'],
  joshua: ['JOS'], judges: ['JDG', 'JUD'], ruth: ['RUT'], '1-samuel': ['1SA'], '2-samuel': ['2SA'],
  '1-kings': ['1KI'], '2-kings': ['2KI'], '1-chronicles': ['1CH'], '2-chronicles': ['2CH'], ezra: ['EZR'],
  nehemiah: ['NEH'], esther: ['EST'], job: ['JOB'], psalms: ['PSA'], proverbs: ['PRO'], ecclesiastes: ['ECC'],
  'song-of-solomon': ['SNG'], isaiah: ['ISA'], jeremiah: ['JER'], lamentations: ['LAM'], ezekiel: ['EZK'],
  daniel: ['DAN'], hosea: ['HOS'], joel: ['JOL'], amos: ['AMO'], obadiah: ['OBA'], jonah: ['JON'], micah: ['MIC'],
  nahum: ['NAM'], habakkuk: ['HAB'], zephaniah: ['ZEP'], haggai: ['HAG'], zechariah: ['ZEC'], malachi: ['MAL'],
  matthew: ['MAT'], mark: ['MRK'], luke: ['LUK'], john: ['JHN'], acts: ['ACT'], romans: ['ROM'],
  '1-corinthians': ['1CO'], '2-corinthians': ['2CO'], galatians: ['GAL'], ephesians: ['EPH'], philippians: ['PHP'],
  colossians: ['COL'], '1-thessalonians': ['1TH'], '2-thessalonians': ['2TH'], '1-timothy': ['1TI'],
  '2-timothy': ['2TI'], titus: ['TIT'], philemon: ['PHM'], hebrews: ['HEB'], james: ['JAS'], '1-peter': ['1PE'],
  '2-peter': ['2PE'], '1-john': ['1JN'], '2-john': ['2JN'], '3-john': ['3JN'], jude: ['JDE', 'JUD'], revelation: ['REV'],
};

/** The dataset files Judges under "JUD"; only accept a file whose size matches the book. */
const EXPECTED_CHAPTERS: Record<string, number> = { judges: 21, jude: 1 };

export interface StudyNote {
  /** Verse the note is attached to */
  verse: number;
  /** Reference the note covers, e.g. "3:16" or "3:1-21" or "Ps 23" */
  label: string;
  /** Note text, one entry per paragraph */
  paragraphs: string[];
}

export interface StudyChapter {
  book: string;
  chapter: number;
  bookName: string;
  notes: StudyNote[];
  /** Short "Purpose / Author / Date / Setting" overview */
  summary: string;
  /** Full book introduction */
  introduction: string;
}

interface RawChapter {
  book: { name: string; numberOfChapters: number; introduction?: string; introductionSummary?: string };
  chapter: { number: number; content: { type: string; number?: number; content?: unknown[] }[] };
}

const memory = new Map<string, Promise<StudyChapter | null>>();

const LABEL = /^((?:\d+:\d+(?:[-–]\d+(?::\d+)?)?)|(?:Pss?\s+\d+(?:[-–]\d+)?))\s+/;

/** "3:3 born again: Or born from above. • Nicodemus…" → label + paragraphs */
const splitNote = (raw: string, verse: number, chapter: number): StudyNote => {
  const text = raw.trim();
  const m = text.match(LABEL);
  const label = m ? m[1] : `${chapter}:${verse}`;
  const body = m ? text.slice(m[0].length) : text;
  return {
    verse,
    label,
    paragraphs: body.split(/\s+•\s+/).map((p) => p.trim()).filter(Boolean),
  };
};

async function fetchRaw(id: string, chapter: number): Promise<RawChapter | null> {
  const res = await fetch(`${BASE}/${id}/${chapter}.json`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Study notes unavailable (${res.status})`);
  return res.json();
}

async function load(apiBook: string, chapter: number): Promise<StudyChapter | null> {
  const ids = BOOK_IDS[apiBook];
  if (!ids) return null;
  for (const id of ids) {
    const raw = await fetchRaw(id, chapter);
    if (!raw) continue;
    const expected = EXPECTED_CHAPTERS[apiBook];
    if (expected && raw.book.numberOfChapters !== expected) continue;
    const notes: StudyNote[] = [];
    for (const item of raw.chapter.content || []) {
      if (item.type !== 'verse' || !item.number) continue;
      for (const entry of item.content || []) {
        if (typeof entry === 'string' && entry.trim()) notes.push(splitNote(entry, item.number, chapter));
      }
    }
    return {
      book: apiBook,
      chapter,
      bookName: raw.book.name,
      notes,
      summary: raw.book.introductionSummary || '',
      introduction: raw.book.introduction || '',
    };
  }
  return null;
}

export const studyNotesService = {
  /** Notes for one chapter, or null when the dataset has none. Cached for the session. */
  getChapter(book: string, chapter: number): Promise<StudyChapter | null> {
    const apiBook = normalizeBookApiName(book);
    const key = `${apiBook}:${chapter}`;
    let pending = memory.get(key);
    if (!pending) {
      pending = load(apiBook, chapter).catch((error) => {
        memory.delete(key);
        throw error;
      });
      memory.set(key, pending);
    }
    return pending;
  },

  /** Verse numbers in a chapter that have a study note. */
  async versesWithNotes(book: string, chapter: number): Promise<Set<number>> {
    try {
      const data = await this.getChapter(book, chapter);
      return new Set((data?.notes || []).map((n) => n.verse));
    } catch {
      return new Set();
    }
  },
};

// ── Cross references ───────────────────────────────────────────────────

/** Abbreviations used inside the notes → app book ids */
const ABBREVIATIONS: Record<string, string> = {
  gen: 'genesis', exod: 'exodus', lev: 'leviticus', num: 'numbers', deut: 'deuteronomy', josh: 'joshua',
  judg: 'judges', ruth: 'ruth', '1 sam': '1-samuel', '2 sam': '2-samuel', '1 kgs': '1-kings', '2 kgs': '2-kings',
  '1 chr': '1-chronicles', '2 chr': '2-chronicles', ezra: 'ezra', neh: 'nehemiah', esth: 'esther', job: 'job',
  ps: 'psalms', pss: 'psalms', prov: 'proverbs', eccl: 'ecclesiastes', song: 'song-of-solomon', isa: 'isaiah',
  jer: 'jeremiah', lam: 'lamentations', ezek: 'ezekiel', dan: 'daniel', hos: 'hosea', joel: 'joel', amos: 'amos',
  obad: 'obadiah', jonah: 'jonah', mic: 'micah', nah: 'nahum', hab: 'habakkuk', zeph: 'zephaniah', hag: 'haggai',
  zech: 'zechariah', mal: 'malachi', matt: 'matthew', mark: 'mark', luke: 'luke', john: 'john', jn: 'john',
  acts: 'acts', rom: 'romans', '1 cor': '1-corinthians', '2 cor': '2-corinthians', gal: 'galatians',
  eph: 'ephesians', phil: 'philippians', col: 'colossians', '1 thes': '1-thessalonians', '2 thes': '2-thessalonians',
  '1 thess': '1-thessalonians', '2 thess': '2-thessalonians', '1 tim': '1-timothy', '2 tim': '2-timothy',
  titus: 'titus', phlm: 'philemon', heb: 'hebrews', jas: 'james', '1 pet': '1-peter', '2 pet': '2-peter',
  '1 jn': '1-john', '2 jn': '2-john', '3 jn': '3-john', jude: 'jude', rev: 'revelation',
};

const bookFromWord = (word?: string): string | null => {
  if (!word) return null;
  const key = word.toLowerCase().replace(/\.$/, '');
  if (ABBREVIATIONS[key]) return ABBREVIATIONS[key];
  const normalized = normalizeBookApiName(word);
  return BOOK_IDS[normalized] ? normalized : null;
};

export type NoteSegment =
  | { kind: 'text'; text: string }
  | { kind: 'ref'; text: string; book: string; chapter: number; verse: number };

const REF = /(?:\b((?:[1-3]\s)?[A-Z][a-z]+\.?)\s)?(\d{1,3}):(\d{1,3})(?:[-–]\d{1,3}(?![\d:]))?/g;

/**
 * Break a note paragraph into plain text and tappable references. Bare
 * references ("3:16") belong to the last book named in the same clause,
 * otherwise to the book being read.
 */
export function linkReferences(text: string, currentBook: string): NoteSegment[] {
  const out: NoteSegment[] = [];
  let last = 0;
  let clauseBook: string | null = null;
  for (const m of text.matchAll(REF)) {
    const start = m.index ?? 0;
    const between = text.slice(last, start);
    // A closing bracket or a full stop ends the clause a book name applies to
    if (/[).]\s|\)$/.test(between)) clauseBook = null;
    const named = bookFromWord(m[1]);
    if (named) clauseBook = named;
    const book = named ?? clauseBook ?? currentBook;
    const refStart = named ? start : start + (m[1] ? m[1].length + 1 : 0);
    if (refStart > last) out.push({ kind: 'text', text: text.slice(last, refStart) });
    out.push({ kind: 'ref', text: text.slice(refStart, start + m[0].length), book, chapter: Number(m[2]), verse: Number(m[3]) });
    last = start + m[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) });
  return out;
}

/** "born again: Or born from above." → the quoted phrase the note explains */
export function splitLemma(paragraph: string): { lemma: string | null; rest: string } {
  const m = paragraph.match(/^([^:()\d]{1,60}):\s+(.*)$/s);
  // "message . . . vision:" keeps its ellipsis; any other full stop means it's a sentence
  if (!m || /[.;!?]/.test(m[1].replace(/(\s?\.){3}/g, ''))) return { lemma: null, rest: paragraph };
  return { lemma: m[1], rest: m[2] };
}

/** Tecarta's web reader, which opens the Tecarta app on phones that have it. */
export const tecartaUrl = (bookName: string, chapter: number, verse?: number) =>
  `https://tecartabible.com/bible/${encodeURIComponent(bookName).replace(/%20/g, '+')}+${chapter}${verse ? `:${verse}` : ''}`;
