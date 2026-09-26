import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpDown, BookOpen, ChevronRight, Copy, Highlighter, Lock, MoreHorizontal, NotebookPen, Plus, Search, Share2, Star, Trash2, X,
} from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Segmented } from '@/components/page/PageKit';
import NoteEditor, { type NoteDraftDefaults } from '@/components/notes/NoteEditor';
import { isGeneralNote, notePreview, noteTitle, passageLabel, relativeDate, type NoteRecord } from '@/components/notes/noteUtils';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { authUrl } from '@/lib/authRedirect';
import { appAlert } from '@/lib/appAlert';
import { cn } from '@/lib/utils';
import { bibleHighlightsService, type HighlightRow } from '@/services/bibleHighlightsService';
import { bibleNotesService, type BibleNoteFolder } from '@/services/bibleNotesService';
import { getAllBooksFlat, normalizeBookApiName } from './bookUtils';
import { HIGHLIGHT_COLORS, HIGHLIGHTS_CHANGED, NOTES_CHANGED, highlightColor } from './highlightColors';
import { escapeHtml, getChapterVerses, verseRanges } from './verseText';

export type LibraryTab = 'highlights' | 'notes';

interface BibleLibrarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tab: LibraryTab;
  onTabChange: (tab: LibraryTab) => void;
  /** Passage being read, for "notes on this chapter" */
  book: string;
  chapter: number;
  /** Translation used for verse text, and its short label ("KJV") */
  version: string;
  versionLabel: string;
  onNavigate: (book: string, chapter: number, verse?: number) => void;
}

interface Group {
  key: string;
  book: string;
  chapter: number;
  color: string;
  verses: number[];
  latest: string;
}

const books = getAllBooksFlat();
const bookIndex = new Map(books.map((b, i) => [b.apiName, i]));
const bookName = (api: string) => books.find((b) => b.apiName === api)?.name ?? api;
const groupLabel = (g: Pick<Group, 'book' | 'chapter' | 'verses'>) => `${bookName(g.book)} ${g.chapter}:${verseRanges(g.verses)}`;

const stamp = (h: HighlightRow) => h.updated_at || h.created_at || '';

/**
 * One highlight per verse — the newest, as the reader shows it (older rows are
 * colours it replaced). Consecutive verses of the same colour become one card.
 */
function groupHighlights(rows: HighlightRow[]): Group[] {
  const newest = new Map<string, HighlightRow>();
  rows.forEach((h) => {
    if (!h.verse) return;
    const book = normalizeBookApiName(h.book);
    const key = `${book}|${h.chapter}|${h.verse}`;
    const prev = newest.get(key);
    if (!prev || stamp(h) > stamp(prev)) newest.set(key, { ...h, book });
  });
  const sorted = [...newest.values()].sort(
    (a, b) =>
      (bookIndex.get(a.book) ?? 99) - (bookIndex.get(b.book) ?? 99) || a.chapter - b.chapter || (a.verse ?? 0) - (b.verse ?? 0),
  );
  const out: Group[] = [];
  for (const h of sorted) {
    const color = h.highlight_color || 'yellow';
    const prev = out[out.length - 1];
    if (prev && prev.book === h.book && prev.chapter === h.chapter && prev.color === color && h.verse === prev.verses[prev.verses.length - 1] + 1) {
      prev.verses.push(h.verse!);
      if (stamp(h) > prev.latest) prev.latest = stamp(h);
    } else {
      // Each verse is in exactly one card, so its first verse makes a unique key
      out.push({ key: `${h.book}-${h.chapter}-${h.verse}`, book: h.book, chapter: h.chapter, color, verses: [h.verse!], latest: stamp(h) });
    }
  }
  return out;
}

// Verse text of highlighted passages, kept on the device so the list opens instantly
const TEXT_CACHE_KEY = 'bible_highlight_texts_v1';
let textCache: Record<string, string> | null = null;
let textCacheTimer: ReturnType<typeof setTimeout> | undefined;
const textCacheMap = () => {
  if (!textCache) {
    try {
      textCache = JSON.parse(localStorage.getItem(TEXT_CACHE_KEY) || '{}');
    } catch {
      textCache = {};
    }
  }
  return textCache!;
};
const rememberText = (key: string, text: string) => {
  const map = textCacheMap();
  map[key] = text;
  clearTimeout(textCacheTimer);
  textCacheTimer = setTimeout(() => {
    const keys = Object.keys(map);
    keys.slice(0, Math.max(0, keys.length - 1000)).forEach((k) => delete map[k]);
    try {
      localStorage.setItem(TEXT_CACHE_KEY, JSON.stringify(map));
    } catch {
      /* storage full */
    }
  }, 1000);
};

// Last copy of the lists, so the sheet opens instantly and refreshes behind the scenes
const readJson = <T,>(key: string): T | undefined => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') ?? undefined;
  } catch {
    return undefined;
  }
};
const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full */
  }
};
const highlightsKey = (userId: string) => `bible_highlights_cache_v1_${userId}`;
/** Shared with the Notes page, which keeps the same list */
const notesKey = (userId: string) => `notes_cache_v2_${userId}`;
const memory: Record<string, { highlights?: HighlightRow[]; notes?: NoteRecord[]; loadedAt?: number }> = {};
const libraryCache = (userId: string) => {
  const m = (memory[userId] ??= {});
  m.highlights ??= readJson<HighlightRow[]>(highlightsKey(userId));
  m.notes ??= readJson<NoteRecord[]>(notesKey(userId));
  return m;
};

const passageTextKey = (version: string, g: Pick<Group, 'book' | 'chapter' | 'verses'>) =>
  `${version}|${g.book}|${g.chapter}|${g.verses.join(',')}`;

const PAGE = 40;

const BibleLibrarySheet = ({
  open,
  onOpenChange,
  tab,
  onTabChange,
  book,
  chapter,
  version,
  versionLabel,
  onNavigate,
}: BibleLibrarySheetProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const apiBook = normalizeBookApiName(book);

  const cached = user ? libraryCache(user.id) : undefined;
  const [highlights, setHighlights] = useState<HighlightRow[]>(() => cached?.highlights ?? []);
  const [notes, setNotes] = useState<NoteRecord[]>(() => cached?.notes ?? []);
  const [folders, setFolders] = useState<BibleNoteFolder[]>([]);
  const [highlightsReady, setHighlightsReady] = useState(!!cached?.highlights);
  const [notesReady, setNotesReady] = useState(!!cached?.notes);
  const [limit, setLimit] = useState(PAGE);
  const [query, setQuery] = useState('');
  const [colorFilter, setColorFilter] = useState('all');
  const [order, setOrder] = useState<'recent' | 'bible'>(() => {
    try {
      return localStorage.getItem('bible_highlights_order') === 'bible' ? 'bible' : 'recent';
    } catch {
      return 'recent';
    }
  });
  // Loaded verse text for search, kept out of state so cards loading don't re-render the list
  const texts = useRef<Record<string, string>>({});
  const [textTick, setTextTick] = useState(0);
  const tickTimer = useRef<ReturnType<typeof setTimeout>>();
  const [editor, setEditor] = useState<{ note: NoteRecord | null; defaults?: NoteDraftDefaults } | null>(null);

  // A different account: start from that account's saved copy
  useEffect(() => {
    const c = user ? libraryCache(user.id) : undefined;
    setHighlights(c?.highlights ?? []);
    setNotes(c?.notes ?? []);
    setHighlightsReady(!!c?.highlights);
    setNotesReady(!!c?.notes);
  }, [user]);

  const loadHighlights = useCallback(async () => {
    if (!user) return;
    const c = libraryCache(user.id);
    try {
      const rows = await bibleHighlightsService.listAll(user.id);
      c.highlights = rows;
      writeJson(highlightsKey(user.id), rows);
      setHighlights(rows);
    } catch (error) {
      console.error('Failed to load highlights', error);
      if (!c.highlights) appAlert("Couldn't load your highlights", 'Check your connection and try again.', 'error');
    } finally {
      setHighlightsReady(true);
    }
  }, [user]);

  const loadNotes = useCallback(async () => {
    if (!user) return;
    const c = libraryCache(user.id);
    const { data, error } = await supabase.from('bible_notes').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
    if (!error && data) {
      const list = data as unknown as NoteRecord[];
      c.notes = list;
      writeJson(notesKey(user.id), list);
      setNotes(list);
    }
    setNotesReady(true);
  }, [user]);

  const load = useCallback(() => {
    if (!user) return;
    libraryCache(user.id).loadedAt = Date.now();
    loadHighlights();
    loadNotes();
  }, [user, loadHighlights, loadNotes]);

  // Fetch quietly while the person reads, so the first open is already up to date
  useEffect(() => {
    if (!user) return;
    const t = setTimeout(load, 1500);
    return () => clearTimeout(t);
  }, [user, load]);

  // Refresh on open unless it was just fetched
  useEffect(() => {
    if (!open || !user) return;
    if (Date.now() - (libraryCache(user.id).loadedAt ?? 0) > 15000) load();
  }, [open, user, load]);

  // Changes made in the reader: refresh now if open, otherwise next time it opens
  useEffect(() => {
    const onChange = () => {
      if (!user) return;
      if (open) load();
      else libraryCache(user.id).loadedAt = 0;
    };
    window.addEventListener(HIGHLIGHTS_CHANGED, onChange);
    window.addEventListener(NOTES_CHANGED, onChange);
    return () => {
      window.removeEventListener(HIGHLIGHTS_CHANGED, onChange);
      window.removeEventListener(NOTES_CHANGED, onChange);
    };
  }, [open, user, load]);

  // Folders are only needed to file a note
  useEffect(() => {
    if (!editor || !user || folders.length) return;
    bibleNotesService.getFolders(user.id).then(setFolders).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, user]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    try {
      localStorage.setItem('bible_highlights_order', order);
    } catch {
      /* ignore */
    }
  }, [order]);

  // ── Highlights ──────────────────────────────────────────────────────
  const groups = useMemo(() => groupHighlights(highlights), [highlights]);
  const colorCounts = useMemo(() => {
    const c: Record<string, number> = {};
    groups.forEach((g) => (c[g.color] = (c[g.color] || 0) + 1));
    return c;
  }, [groups]);

  const q = query.trim().toLowerCase();
  const groupText = useCallback(
    (g: Group) => texts.current[g.key] ?? textCacheMap()[passageTextKey(version, g)] ?? '',
    [version],
  );
  const visibleGroups = useMemo(() => {
    const list = groups.filter((g) => {
      if (colorFilter !== 'all' && g.color !== colorFilter) return false;
      if (!q) return true;
      return groupLabel(g).toLowerCase().includes(q) || groupText(g).toLowerCase().includes(q);
    });
    return order === 'recent' ? [...list].sort((a, b) => b.latest.localeCompare(a.latest)) : list;
    // textTick: search again once more verse text has loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, colorFilter, q, order, groupText, textTick]);

  // Draw the list a page at a time; more appear as you scroll
  useEffect(() => setLimit(PAGE), [colorFilter, q, order, tab, open]);
  const shownGroups = visibleGroups.slice(0, limit);

  const qRef = useRef(q);
  qRef.current = q;
  const onText = useCallback((key: string, text: string) => {
    texts.current[key] = text;
    if (!qRef.current) return;
    clearTimeout(tickTimer.current);
    tickTimer.current = setTimeout(() => setTextTick((t) => t + 1), 300);
  }, []);

  const recolor = async (g: Group, color: string) => {
    if (!user || color === g.color) return;
    const before = highlights;
    setHighlights((prev) =>
      prev.map((h) =>
        normalizeBookApiName(h.book) === g.book && h.chapter === g.chapter && g.verses.includes(h.verse ?? -1)
          ? { ...h, highlight_color: color }
          : h,
      ),
    );
    try {
      await bibleHighlightsService.setColor(user.id, g.book, g.chapter, g.verses, color);
    } catch {
      setHighlights(before);
      appAlert("Couldn't change the colour", 'Please try again.', 'error');
    }
  };

  const removeGroup = async (g: Group) => {
    if (!user) return;
    const before = highlights;
    setHighlights((prev) =>
      prev.filter((h) => !(normalizeBookApiName(h.book) === g.book && h.chapter === g.chapter && g.verses.includes(h.verse ?? -1))),
    );
    try {
      await bibleHighlightsService.remove(user.id, g.book, g.chapter, g.verses);
      appAlert('Highlight removed', groupLabel(g), 'success');
    } catch {
      setHighlights(before);
      appAlert("Couldn't remove the highlight", 'Please try again.', 'error');
    }
  };

  const copyGroup = async (g: Group) => {
    const text = groupText(g) || (await passageText(g));
    const body = `${groupLabel(g)} ${versionLabel}\n${text}`;
    try {
      await navigator.clipboard.writeText(body);
      appAlert('Copied', groupLabel(g), 'success');
    } catch {
      appAlert("Couldn't copy", 'Please try again.', 'error');
    }
  };

  const shareGroup = async (g: Group) => {
    const text = groupText(g) || (await passageText(g));
    try {
      await navigator.share({ title: groupLabel(g), text: `“${text}” — ${groupLabel(g)} ${versionLabel}` });
    } catch {
      /* dismissed */
    }
  };

  const passageText = async (g: Pick<Group, 'book' | 'chapter' | 'verses'>) => {
    const map = await getChapterVerses(version, g.book, g.chapter);
    return g.verses.map((v) => map.get(v) || '').join(' ').trim();
  };

  const noteOnGroup = async (g: Group) => {
    const text = groupText(g) || (await passageText(g));
    setEditor({
      note: null,
      defaults: {
        book: g.book,
        chapter: g.chapter,
        verse: g.verses[0],
        title: groupLabel(g),
        body: text ? `<blockquote><p>${escapeHtml(text)}</p></blockquote><p></p>` : '',
      },
    });
  };

  // ── Notes ───────────────────────────────────────────────────────────
  const chapterLabel = `${bookName(apiBook)} ${chapter}`;
  const matchingNotes = useMemo(
    () =>
      notes.filter((n) => {
        if (!q) return true;
        return `${noteTitle(n)} ${notePreview(n, 400)} ${isGeneralNote(n) ? '' : passageLabel(n)}`.toLowerCase().includes(q);
      }),
    [notes, q],
  );
  const onThisChapter = (n: NoteRecord) => !isGeneralNote(n) && normalizeBookApiName(n.book) === apiBook && n.chapter === chapter;
  const chapterNotes = matchingNotes.filter(onThisChapter);
  const otherNotes = matchingNotes.filter((n) => !onThisChapter(n));

  const afterNoteChange = () => window.dispatchEvent(new CustomEvent(NOTES_CHANGED));

  const noteRow = (note: NoteRecord) => (
    <button
      key={note.id}
      onClick={() => setEditor({ note })}
      className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-muted/60 active:bg-muted"
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300">
        <NotebookPen className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-semibold text-foreground">{noteTitle(note)}</span>
          {note.is_favorite && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
        </span>
        {notePreview(note, 140) && <span className="mt-0.5 line-clamp-2 block text-[13.5px] text-muted-foreground">{notePreview(note, 140)}</span>}
        <span className="mt-1 block text-xs text-muted-foreground">
          {isGeneralNote(note) ? '' : `${passageLabel(note)} · `}
          {relativeDate(note.updated_at || note.created_at)}
        </span>
      </span>
      <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
    </button>
  );

  const go = (b: string, c: number, v?: number) => {
    onOpenChange(false);
    onNavigate(b, c, v);
  };

  // ── Layout ──────────────────────────────────────────────────────────
  const body = !user ? (
    <div className="flex flex-1 flex-col items-center justify-center px-8 pb-16 text-center">
      <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
        <Lock className="h-6 w-6" />
      </span>
      <p className="font-outfit text-xl font-bold text-foreground">Keep what God shows you</p>
      <p className="mt-1.5 max-w-xs text-[15px] text-muted-foreground">
        Sign in to save highlights and notes, and find them again on any device.
      </p>
      <button
        onClick={() => {
          onOpenChange(false);
          navigate(authUrl(`${window.location.pathname}${window.location.search}`, 'signin'));
        }}
        className="mt-6 h-12 w-full max-w-xs rounded-2xl bg-blue-600 font-bold text-white shadow-lg shadow-blue-600/25 active:scale-[0.98]"
      >
        Sign in
      </button>
    </div>
  ) : (
    <>
      <div className="shrink-0 px-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === 'highlights' ? 'Search highlights' : 'Search notes'}
            className="h-11 w-full rounded-xl bg-muted/70 pl-10 pr-10 text-[16px] text-foreground outline-none ring-blue-500/30 placeholder:text-muted-foreground focus:ring-2"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-muted" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {tab === 'highlights' && groups.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <div className="-mx-1 flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => setColorFilter('all')}
                className={cn(
                  'h-8 shrink-0 rounded-full px-3 text-[13px] font-semibold transition',
                  colorFilter === 'all' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground',
                )}
              >
                All {groups.length}
              </button>
              {HIGHLIGHT_COLORS.filter((c) => colorCounts[c.value]).map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColorFilter(colorFilter === c.value ? 'all' : c.value)}
                  className={cn(
                    'flex h-8 shrink-0 items-center gap-1.5 rounded-full pl-1.5 pr-2.5 text-[13px] font-semibold transition',
                    colorFilter === c.value ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground',
                  )}
                  aria-label={`${c.name} highlights`}
                >
                  <span className={cn('h-5 w-5 rounded-full ring-2 ring-white/70 dark:ring-slate-900/40', c.swatch)} />
                  {colorCounts[c.value]}
                </button>
              ))}
            </div>
            <button
              onClick={() => setOrder(order === 'recent' ? 'bible' : 'recent')}
              className="flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-[13px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {order === 'recent' ? 'Recent' : 'Bible order'}
            </button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-2">
        {(tab === 'highlights' ? !highlightsReady : !notesReady) ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />)}
          </div>
        ) : tab === 'highlights' ? (
          visibleGroups.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-50 text-yellow-600 dark:bg-yellow-950/40 dark:text-yellow-300">
                {q ? <Search className="h-7 w-7" /> : <Highlighter className="h-7 w-7" />}
              </span>
              <p className="mt-4 text-lg font-semibold text-foreground">{q || colorFilter !== 'all' ? 'No matching highlights' : 'No highlights yet'}</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                {q || colorFilter !== 'all'
                  ? 'Try another word, book or colour.'
                  : 'While you read, tap a verse and choose a colour. Every highlight is kept here, on all your devices.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {shownGroups.map((g) => (
                <HighlightCard
                  key={g.key}
                  group={g}
                  version={version}
                  query={q}
                  onText={onText}
                  onOpen={() => go(g.book, g.chapter, g.verses[0])}
                  onCopy={() => copyGroup(g)}
                  onShare={typeof navigator.share === 'function' ? () => shareGroup(g) : undefined}
                  onNote={() => noteOnGroup(g)}
                  onRecolor={(c) => recolor(g, c)}
                  onRemove={() => removeGroup(g)}
                />
              ))}
              {limit < visibleGroups.length && <MoreOnScroll onVisible={() => setLimit((l) => l + PAGE)} />}
            </div>
          )
        ) : (
          <div className="space-y-5">
            <button
              onClick={() => setEditor({ note: null, defaults: { book: apiBook, chapter, title: chapterLabel } })}
              className="flex w-full items-center gap-3 rounded-2xl bg-blue-600 px-4 py-3.5 text-left text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-700 active:scale-[0.99]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                <Plus className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <span className="block font-semibold">New note</span>
                <span className="block text-sm text-white/80">on {chapterLabel}</span>
              </span>
            </button>

            {chapterNotes.length > 0 && (
              <section>
                <p className="mb-2 px-1 text-[12.5px] font-bold uppercase tracking-[0.07em] text-muted-foreground">On {chapterLabel}</p>
                <div className="divide-y divide-slate-100 overflow-hidden rounded-[20px] border border-slate-200/70 bg-card dark:divide-slate-800 dark:border-slate-800">
                  {chapterNotes.map(noteRow)}
                </div>
              </section>
            )}

            {otherNotes.length > 0 ? (
              <section>
                <p className="mb-2 px-1 text-[12.5px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
                  {chapterNotes.length ? 'All other notes' : 'All notes'}
                </p>
                <div className="divide-y divide-slate-100 overflow-hidden rounded-[20px] border border-slate-200/70 bg-card dark:divide-slate-800 dark:border-slate-800">
                  {otherNotes.map(noteRow)}
                </div>
              </section>
            ) : (
              chapterNotes.length === 0 && (
                <div className="flex flex-col items-center px-6 py-10 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300">
                    {q ? <Search className="h-7 w-7" /> : <NotebookPen className="h-7 w-7" />}
                  </span>
                  <p className="mt-4 text-lg font-semibold text-foreground">{q ? 'No matching notes' : 'No notes yet'}</p>
                  <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                    {q ? 'Try another word or verse.' : 'Capture what God is showing you. Notes save automatically as you type.'}
                  </p>
                </div>
              )
            )}

            <button
              onClick={() => {
                onOpenChange(false);
                navigate('/bible-notes', { state: { returnBook: apiBook, returnChapter: chapter } });
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-semibold text-blue-600 hover:bg-muted dark:text-blue-400"
            >
              <BookOpen className="h-4 w-4" /> Open Notes · folders, favourites and export
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      <Sheet open={open && !editor} onOpenChange={onOpenChange}>
        <SheetContent
          side={isMobile ? 'bottom' : 'right'}
          className="flex h-[92dvh] w-full flex-col gap-0 rounded-t-[28px] p-0 data-[state=open]:duration-300 sm:h-full sm:max-w-md sm:rounded-none [&>button]:right-5 [&>button]:top-5"
        >
          <div className="shrink-0 px-5 pb-3 pt-6">
            <SheetTitle className="font-outfit text-[26px] font-extrabold tracking-tight">My Bible</SheetTitle>
            <SheetDescription className="text-[13.5px]">Your highlights and notes, all in one place.</SheetDescription>
          </div>
          <div className="shrink-0 px-4">
            <Segmented<LibraryTab>
              value={tab}
              onChange={onTabChange}
              className="mb-3"
              options={[
                { value: 'highlights', label: <><Highlighter className="h-4 w-4" /> Highlights{user && highlightsReady ? ` · ${groups.length}` : ''}</> },
                { value: 'notes', label: <><NotebookPen className="h-4 w-4" /> Notes{user && notesReady ? ` · ${notes.length}` : ''}</> },
              ]}
            />
          </div>
          {body}
        </SheetContent>
      </Sheet>

      {user && (
        <NoteEditor
          open={!!editor}
          userId={user.id}
          note={editor?.note ?? null}
          defaults={editor?.defaults}
          folders={folders}
          onClose={() => setEditor(null)}
          onSaved={(saved) => {
            setNotes((prev) => (prev.some((n) => n.id === saved.id) ? prev.map((n) => (n.id === saved.id ? saved : n)) : [saved, ...prev]));
            afterNoteChange();
          }}
          onDeleted={(id) => {
            setNotes((prev) => prev.filter((n) => n.id !== id));
            afterNoteChange();
          }}
        />
      )}
    </>
  );
};

/** One highlighted passage: the verse text on its colour, with quick actions. */
const HighlightCard = ({
  group,
  version,
  query,
  onText,
  onOpen,
  onCopy,
  onShare,
  onNote,
  onRecolor,
  onRemove,
}: {
  group: Group;
  version: string;
  query: string;
  onText: (key: string, text: string) => void;
  onOpen: () => void;
  onCopy: () => void;
  onShare?: () => void;
  onNote: () => void;
  onRecolor: (color: string) => void;
  onRemove: () => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const versesKey = group.verses.join(',');
  const cacheKey = passageTextKey(version, group);
  const [text, setText] = useState<string | null>(() => textCacheMap()[cacheKey] ?? null);
  const color = highlightColor(group.color);

  // Load the verse text once the card scrolls into view (instantly if it's saved on the device)
  useEffect(() => {
    const saved = textCacheMap()[cacheKey];
    if (saved) {
      setText(saved);
      onText(group.key, saved);
      return;
    }
    setText(null);
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    let giveUp: ReturnType<typeof setTimeout> | undefined;
    const fetchText = () => {
      // Never leave a card loading: after 10s show "Tap to read" instead
      giveUp = setTimeout(() => !cancelled && setText((t) => t ?? ''), 10000);
      return getChapterVerses(version, group.book, group.chapter).then((map) => {
        clearTimeout(giveUp);
        if (cancelled) return;
        const t = group.verses.map((v) => map.get(v) || '').join(' ').trim();
        setText(t);
        if (t) {
          onText(group.key, t);
          rememberText(cacheKey, t);
        }
      });
    };
    if (typeof IntersectionObserver === 'undefined') {
      fetchText();
      return () => {
        cancelled = true;
        clearTimeout(giveUp);
      };
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          fetchText();
        }
      },
      { rootMargin: '300px' },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      clearTimeout(giveUp);
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  const label = groupLabel(group);

  return (
    <div ref={ref} className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-card shadow-sm dark:border-slate-800">
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: color.hex }} />
      <button onClick={onOpen} className="block w-full py-3.5 pl-5 pr-12 text-left transition active:bg-muted/60">
        <span className="flex items-center gap-1.5 text-[13px]">
          <span className="font-bold text-foreground">{label}</span>
          <span className="text-muted-foreground">· {group.latest ? relativeDate(group.latest) : ''}</span>
        </span>
        {text === null ? (
          <span className="mt-2 block space-y-1.5">
            <span className="block h-3.5 w-full animate-pulse rounded bg-muted" />
            <span className="block h-3.5 w-4/5 animate-pulse rounded bg-muted" />
          </span>
        ) : text ? (
          <span className="mt-1.5 line-clamp-4 block font-serif text-[15.5px] leading-[1.7] text-foreground">
            <mark className={cn('verse-highlight rounded-[4px] px-0.5 text-inherit box-decoration-clone', color.mark)}>
              <Emphasis text={text} query={query} />
            </mark>
          </span>
        ) : (
          <span className="mt-1.5 block text-sm text-muted-foreground">Tap to read this passage</span>
        )}
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="absolute right-1.5 top-2 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Options for ${label}`}>
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 rounded-xl">
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">Colour</DropdownMenuLabel>
          <div className="flex items-center justify-between px-2 pb-2">
            {HIGHLIGHT_COLORS.map((c) => (
              <DropdownMenuItem
                key={c.value}
                onSelect={() => onRecolor(c.value)}
                className={cn(
                  'h-7 w-7 cursor-pointer rounded-full p-0 ring-offset-2 ring-offset-popover focus:bg-transparent',
                  c.swatch,
                  c.value === group.color && 'ring-2 ring-foreground',
                )}
                aria-label={c.name}
              />
            ))}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onOpen}>
            <BookOpen className="mr-2 h-4 w-4" /> Go to passage
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onNote}>
            <NotebookPen className="mr-2 h-4 w-4" /> Write a note
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onCopy}>
            <Copy className="mr-2 h-4 w-4" /> Copy
          </DropdownMenuItem>
          {onShare && (
            <DropdownMenuItem onSelect={onShare}>
              <Share2 className="mr-2 h-4 w-4" /> Share
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onRemove} className="text-red-600 focus:text-red-600 dark:text-red-400">
            <Trash2 className="mr-2 h-4 w-4" /> Remove highlight
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

/** Asks for the next page of cards as the end of the list comes near. */
const MoreOnScroll = ({ onVisible }: { onVisible: () => void }) => {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onVisible);
  cb.current = onVisible;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && cb.current(), { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="flex justify-center py-4">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
    </div>
  );
};

/** Underline search matches inside the verse text. */
const Emphasis = ({ text, query }: { text: string; query: string }) => {
  if (!query) return <>{text}</>;
  const i = text.toLowerCase().indexOf(query);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span className="underline decoration-2 underline-offset-2">{text.slice(i, i + query.length)}</span>
      {text.slice(i + query.length)}
    </>
  );
};

export default BibleLibrarySheet;
