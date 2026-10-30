/**
 * Christian study notes for the chapter being read, picked in the Study notes
 * sheet ("Notes from"):
 *  • Tyndale Open Study Notes (modern, CC BY-SA 4.0, the default), and the
 *    classic Christian commentaries of the Free Use Bible API
 *    (bible.helloao.org) that are named in KNOWN below; others it lists are
 *    left out.
 *  • Matthew Henry's Concise Commentary and the Geneva Bible notes,
 *    both public domain, served by the app itself from public/study-notes/
 *    (made by scripts/make-study-notes.py).
 */
import { normalizeBookApiName } from '@/components/bible/bookUtils';

const API = 'https://bible.helloao.org/api';
const BASE = `${API}/c/tyndale`;

// ── Which notes ────────────────────────────────────────────────────────

export interface NotesSource {
  id: string;
  name: string;
  /** One line on what it's good for */
  about: string;
  website: string;
  /** "CC BY-SA 4.0", "Public domain"… */
  license: string;
  licenseUrl: string;
  /** Copyright holder, when there is one */
  holder?: string;
  /** Served by the app itself (public/study-notes/{id}) */
  local?: boolean;
}

export const TYNDALE: NotesSource = {
  id: 'tyndale',
  name: 'Tyndale Open Study Notes',
  about: 'Modern study Bible notes, short and clear, verse by verse (Tyndale House)',
  website: 'https://tyndaleopenresources.com/',
  license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  holder: 'Tyndale House Publishers',
};

/** In the app itself: classic Christian study notes, public domain */
const LOCAL: NotesSource[] = [
  {
    id: 'mhcc',
    name: "Matthew Henry's Concise Commentary",
    about: 'Practical notes on every passage: what it means for your life (Matthew Henry, abridged)',
    website: 'https://www.crosswire.org/sword/modules/ModInfo.jsp?modName=MHCC',
    license: 'Public domain',
    licenseUrl: '',
    local: true,
  },
  {
    id: 'geneva',
    name: 'Geneva Bible Notes',
    about: "The first Protestant study Bible's notes, verse by verse",
    website: 'https://en.wikipedia.org/wiki/Geneva_Bible',
    license: 'Public domain',
    licenseUrl: '',
    local: true,
  },
];

/**
 * The Christian study notes and commentaries shown, best first, with what each
 * is good for. Others the Free Use Bible API lists aren't shown.
 */
const KNOWN: Record<string, { about: string; rank: number }> = {
  tyndale: { about: TYNDALE.about, rank: 0 },
  mhcc: { about: LOCAL[0].about, rank: 1 },
  geneva: { about: LOCAL[1].about, rank: 2 },
  'jamieson-fausset-brown': { about: 'Classic Christian study commentary, concise and verse by verse', rank: 3 },
  'matthew-henry': { about: "Matthew Henry's full commentary: longer practical exposition", rank: 4 },
  'adam-clarke': { about: 'Classic Methodist commentary: word meanings and background', rank: 5 },
  'john-gill': { about: 'Classic Baptist commentary, every verse', rank: 6 },
  'keil-delitzsch': { about: 'Classic scholarly Old Testament commentary', rank: 7 },
};
const rank = (s: NotesSource) => KNOWN[s.id]?.rank ?? 99;
const OFFLINE_LIST = [TYNDALE, ...LOCAL];

// v3: v1 lists could include non-Christian commentaries, v2 names and notes had years in them
const SOURCES_KEY = 'study_notes_sources_v3';
const CHOICE_KEY = 'study_notes_source_v1';
let sourcesPromise: Promise<NotesSource[]> | null = null;

const savedSources = (): NotesSource[] | null => {
  try {
    const list = JSON.parse(localStorage.getItem(SOURCES_KEY) || 'null');
    return Array.isArray(list) && list.length ? list : null;
  } catch {
    return null;
  }
};

interface ApiCommentary { id: string; name?: string; englishName?: string; website?: string; licenseUrl?: string; language?: string }

const toSource = (c: ApiCommentary): NotesSource => {
  if (c.id === TYNDALE.id) return TYNDALE;
  const licenseUrl = c.licenseUrl || '';
  return {
    id: c.id,
    // Just the name: no year it was written or published
    name: (c.englishName || c.name || c.id).replace(/\s*\(?\b1[5-9]\d\d(?:[-–]\d{2,4})?\)?\s*$/, ''),
    about: KNOWN[c.id]?.about || '',
    website: c.website || '',
    license: /publicdomain/i.test(licenseUrl) ? 'Public domain' : 'Free to use',
    licenseUrl,
  };
};

/** The Christian study notes on offer, best first (the online list is kept on the phone for offline). */
function listSources(): Promise<NotesSource[]> {
  sourcesPromise ??= fetch(`${API}/available_commentaries.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`Commentaries unavailable (${res.status})`);
      return res.json();
    })
    .then((data: { commentaries?: ApiCommentary[] }) => {
      const online = (data.commentaries || [])
        .filter((c) => c?.id && KNOWN[c.id] && !LOCAL.some((l) => l.id === c.id))
        .map(toSource);
      const list = [...OFFLINE_LIST.filter((s) => !online.some((o) => o.id === s.id)), ...online];
      list.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
      try {
        localStorage.setItem(SOURCES_KEY, JSON.stringify(list));
      } catch {
        /* storage full */
      }
      return list;
    })
    .catch(() => {
      sourcesPromise = null; // try again next time
      return savedSources() || OFFLINE_LIST;
    });
  return sourcesPromise;
}

/** The notes this person picked (Tyndale until they choose) */
function currentSource(): string {
  try {
    return localStorage.getItem(CHOICE_KEY) || TYNDALE.id;
  } catch {
    return TYNDALE.id;
  }
}

function setSource(id: string) {
  try {
    localStorage.setItem(CHOICE_KEY, id);
  } catch {
    /* private mode: just for now */
  }
  window.dispatchEvent(new CustomEvent('studynotes:source', { detail: { id } }));
}

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

// ── The classic commentaries (any id other than Tyndale) ──────────────────

/** App book ids in Bible order (Genesis = 1), to match each commentary's own book ids */
const BOOK_ORDER = Object.keys(BOOK_IDS);
const commentaryBooks = new Map<string, Promise<Map<number, { id: string; introduction: string; name: string }>>>();

function booksOf(source: string) {
  let pending = commentaryBooks.get(source);
  if (!pending) {
    pending = fetch(`${API}/c/${encodeURIComponent(source)}/books.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`Commentary unavailable (${res.status})`);
        return res.json();
      })
      .then((data: { books?: { id: string; order: number; name?: string; commonName?: string; introduction?: string }[] }) =>
        new Map((data.books || []).map((b) => [b.order, { id: b.id, name: b.commonName || b.name || '', introduction: b.introduction || '' }])),
      )
      .catch((error) => {
        commentaryBooks.delete(source);
        throw error;
      });
    commentaryBooks.set(source, pending);
  }
  return pending;
}

type VerseContent = string | { text?: string; lineBreak?: boolean; heading?: string };

/** One verse's commentary: paragraphs are separated by line breaks */
const verseParagraphs = (content: VerseContent[] = []) =>
  content
    .map((c) => (typeof c === 'string' ? c : c?.lineBreak ? '\n' : c?.text || c?.heading || ''))
    .join('')
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

async function loadCommentary(source: string, apiBook: string, chapter: number): Promise<StudyChapter | null> {
  const order = BOOK_ORDER.indexOf(apiBook) + 1;
  if (!order) return null;
  const book = (await booksOf(source)).get(order);
  if (!book) return null;
  const res = await fetch(`${API}/c/${encodeURIComponent(source)}/${book.id}/${chapter}.json`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Commentary unavailable (${res.status})`);
  const raw: { book?: { name?: string; introduction?: string }; chapter?: { content?: { type: string; number?: number; content?: VerseContent[] }[] } } = await res.json();
  const notes: StudyNote[] = [];
  for (const item of raw.chapter?.content || []) {
    if (item.type !== 'verse' || !item.number) continue;
    const paragraphs = verseParagraphs(item.content);
    if (paragraphs.length) notes.push({ verse: item.number, label: `${chapter}:${item.number}`, paragraphs });
  }
  return {
    book: apiBook,
    chapter,
    bookName: raw.book?.name || book.name,
    notes,
    summary: '',
    introduction: raw.book?.introduction || book.introduction,
  };
}

// ── Notes in the app itself (public/study-notes) ──────────────────────────

/** USFM book codes in Bible order, as the files are named */
const USFM = (
  'GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS ' +
  'JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT ' +
  'PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV'
).split(' ');

/** A file in public/study-notes, or null if there isn't one (the host answers missing files with the app's page) */
async function localJson<T>(path: string): Promise<T | null> {
  const res = await fetch(`${import.meta.env.BASE_URL}study-notes/${path}`);
  if (res.status === 404 || !(res.headers.get('content-type') || '').includes('json')) return null;
  if (!res.ok) throw new Error(`Study notes unavailable (${res.status})`);
  return res.json();
}

async function loadLocal(source: string, apiBook: string, chapter: number): Promise<StudyChapter | null> {
  const book = USFM[BOOK_ORDER.indexOf(apiBook)];
  if (!book) return null;
  const [data, about] = await Promise.all([
    localJson<{ notes: { v: number; to: number; p: string[]; label?: string }[] }>(`${source}/${book}/${chapter}.json`),
    localJson<{ intro?: string }>(`${source}/${book}/book.json`).catch(() => null),
  ]);
  if (!data) return null;
  return {
    book: apiBook,
    chapter,
    bookName: '',
    notes: data.notes.map((n) => ({
      verse: n.v,
      label: n.label ?? (n.to > n.v ? `${chapter}:${n.v}-${n.to}` : `${chapter}:${n.v}`),
      paragraphs: n.p,
    })),
    summary: '',
    introduction: about?.intro || '',
  };
}

const loaderFor = (source: string) =>
  source === TYNDALE.id ? load : LOCAL.some((l) => l.id === source) ? (b: string, c: number) => loadLocal(source, b, c) : (b: string, c: number) => loadCommentary(source, b, c);

export const studyNotesService = {
  listSources,
  /** The notes there always are, before the online list arrives */
  builtInSources: OFFLINE_LIST,
  currentSource,
  setSource,

  /** Notes for one chapter from the chosen notes, or null when they have none. Cached for the session. */
  getChapter(book: string, chapter: number, source = currentSource()): Promise<StudyChapter | null> {
    const apiBook = normalizeBookApiName(book);
    const key = `${source}:${apiBook}:${chapter}`;
    let pending = memory.get(key);
    if (!pending) {
      pending = loaderFor(source)(apiBook, chapter).catch((error) => {
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
  // As the classic commentaries write them ("Psa 23:1", "Joh 3:16")
  exo: 'exodus', deu: 'deuteronomy', jos: 'joshua', jdg: 'judges', rut: 'ruth', ezr: 'ezra', est: 'esther',
  psa: 'psalms', pro: 'proverbs', ecc: 'ecclesiastes', sol: 'song-of-solomon', sng: 'song-of-solomon',
  eze: 'ezekiel', joe: 'joel', amo: 'amos', oba: 'obadiah', jon: 'jonah', zep: 'zephaniah', zec: 'zechariah',
  zac: 'zechariah', mat: 'matthew', mar: 'mark', luk: 'luke', joh: 'john', act: 'acts', phi: 'philippians',
  jam: 'james', tit: 'titus', phm: 'philemon', jde: 'jude',
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

/**
 * "born again: Or born from above." (Tyndale) or "In the beginning - Before the
 * creative acts…" (the classic commentaries) → the phrase the note explains
 */
export function splitLemma(paragraph: string): { lemma: string | null; rest: string } {
  const m = paragraph.match(/^([^:()\d]{1,60}):\s+(.*)$/s) || paragraph.match(/^([^:()\d]{1,80}?) [-–—] (.+)$/s);
  // "message . . . vision:" keeps its ellipsis; any other full stop means it's a sentence
  if (!m || /[.;!?]/.test(m[1].replace(/(\s?\.){3}/g, ''))) return { lemma: null, rest: paragraph };
  return { lemma: m[1], rest: m[2] };
}

