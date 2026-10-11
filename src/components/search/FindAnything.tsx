import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, CalendarDays, ChevronRight, CircleHelp, Music, Search, Sparkles, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { DESTINATIONS, POPULAR_SEARCHES, TILE, pathOf, type TileColor } from '@/data/appDirectory';
import { startTour } from '@/lib/appEvents';
import { bookDisplayName, parseReference, resolveBook } from '@/services/bibleSmartSearch';
import { searchService } from '@/services/searchService';

interface Result {
  id: string;
  title: string;
  crumb: string;
  icon: LucideIcon;
  color: TileColor;
  go: () => void;
}

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

/** How well a place matches what was typed (0 = not at all). Every word typed must match something. */
function scoreOf(query: string, d: { title: string; subtitle: string; crumb: string; keywords?: string }) {
  const tokens = words(query);
  if (!tokens.length) return 0;
  const title = words(d.title);
  const keywords = words(d.keywords ?? '');
  const subtitle = words(d.subtitle);
  const crumb = words(d.crumb);
  let total = 0;
  for (const t of tokens) {
    const s = title.includes(t)
      ? 12
      : title.some((w) => w.startsWith(t))
        ? 9
        : keywords.includes(t)
          ? 7
          : keywords.some((w) => w.startsWith(t))
            ? 5
            : subtitle.some((w) => w.startsWith(t))
              ? 3
              : crumb.some((w) => w.startsWith(t))
                ? 2
                : 0;
    if (!s) return 0;
    total += s;
  }
  if (d.title.toLowerCase().startsWith(query.trim().toLowerCase())) total += 6;
  return total;
}

const RECENT_KEY = 'find_recent_v1';
const readRecent = (): string[] => {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(list) ? list.slice(0, 5) : [];
  } catch {
    return [];
  }
};

/**
 * "Find anything": type a word and go straight there, whether it's a page
 * ("give"), something deep inside one ("male" → Men's voice exercises) or a
 * Bible passage ("psalm 23"). Choir songs and events are found too.
 */
/** `request` changes each time something asks for the search (see openSearch). */
const FindAnything = ({ request }: { request: { query: string; at: number } }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<Result[]>([]);
  const [recent, setRecent] = useState<string[]>(readRecent);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(request.query);
    setRecent(readRecent());
    setOpen(true);
  }, [request]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => input.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const close = () => setOpen(false);

  const go = (to: string, label: string) => {
    try {
      const list = [label, ...readRecent().filter((r) => r.toLowerCase() !== label.toLowerCase())].slice(0, 5);
      localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    } catch {
      /* private mode */
    }
    close();
    if (/^https?:/.test(to)) window.open(to, '_blank', 'noopener');
    else navigate(to);
  };

  const results = useMemo<Result[]>(() => {
    const q = query.trim();
    if (!q) return [];
    const out: { score: number; result: Result }[] = [];

    // A Bible passage ("john 3", "psalm 23") goes first
    const ref = parseReference(q);
    if (ref) {
      const label = `${bookDisplayName(ref.book)} ${ref.chapter}${ref.verseStart ? `:${ref.verseStart}` : ''}`;
      out.push({
        score: 100,
        result: { id: 'ref', title: `Open ${label}`, crumb: 'Bible', icon: BookOpen, color: 'blue', go: () => go(`/bible?book=${ref.book}&chapter=${ref.chapter}`, label) },
      });
    }

    DESTINATIONS.forEach((d) => {
      if (d.when === 'signed-in' && !user) return;
      if (d.when === 'signed-out' && user) return;
      const score = scoreOf(q, d);
      if (score) out.push({ score, result: { id: d.id, title: d.title, crumb: d.crumb, icon: d.icon, color: d.color, go: () => go(pathOf(d), d.title) } });
    });

    if (/^(tour|show me around|guide|walkthrough)/i.test(q)) {
      out.push({ score: 30, result: { id: 'tour', title: 'Show me around', crumb: 'Help › The welcome tour', icon: Sparkles, color: 'violet', go: () => (close(), startTour()) } });
    }

    // A Bible book by name ("john", "psalms"), after better matches
    if (!ref && q.length >= 3) {
      const book = resolveBook(q);
      if (book) {
        const name = bookDisplayName(book);
        out.push({ score: 8, result: { id: 'book', title: `Open ${name}`, crumb: 'Bible', icon: BookOpen, color: 'blue', go: () => go(`/bible?book=${book}&chapter=1`, name) } });
      }
    }

    return out.sort((a, b) => b.score - a.score).map((r) => r.result);
  }, [query, user]);

  // Choir songs, folders and events, a moment after typing stops
  useEffect(() => {
    const q = query.trim();
    setFound([]);
    if (q.length < 2) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const list = await searchService.searchApp(q).catch(() => []);
      if (cancelled) return;
      setFound(
        list.slice(0, 6).map((r) => ({
          id: r.id,
          title: r.title,
          crumb: r.description ? `Choir › ${r.description}` : 'Choir',
          icon: r.type === 'event' ? CalendarDays : Music,
          color: r.type === 'event' ? 'orange' : 'indigo',
          go: () => go(r.url, r.title),
        })),
      );
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  if (!open) return null;

  const [best, ...more] = results.length ? results : found;
  const rest = results.length ? [...more, ...found] : more;

  const Row = ({ r }: { r: Result }) => (
    <button onClick={r.go} className="flex w-full items-center gap-3.5 px-4 py-3 text-left transition hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-800/60">
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] text-white', TILE[r.color])}>
        <r.icon className="h-[22px] w-[22px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-semibold text-foreground">{r.title}</span>
        <span className="block truncate text-[13px] text-muted-foreground">{r.crumb}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" />
    </button>
  );

  return createPortal(
    <div className="fixed inset-0 z-[300] flex justify-center bg-slate-900/40 backdrop-blur-sm md:items-start md:p-[8vh_16px]" onClick={close}>
      <div
        role="dialog"
        aria-label="Search"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full flex-col overflow-hidden bg-slate-50 pt-[max(env(safe-area-inset-top),12px)] animate-in fade-in slide-in-from-bottom-4 duration-200 dark:bg-slate-950 md:h-auto md:max-h-[80vh] md:max-w-2xl md:rounded-[28px] md:pt-0 md:shadow-2xl"
      >
        <div className="flex items-center gap-3 px-4 pb-3 md:pt-4">
          <label className="flex h-14 flex-1 items-center gap-3 rounded-[18px] border-2 border-blue-500 bg-card px-4 shadow-[0_0_0_4px_rgba(37,99,235,0.12)]">
            <Search className="h-6 w-6 shrink-0 text-blue-600" />
            <input
              ref={input}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && best?.go()}
              placeholder="What are you looking for?"
              aria-label="What are you looking for?"
              enterKeyHint="go"
              className="min-w-0 flex-1 bg-transparent text-[17px] text-foreground outline-none placeholder:text-muted-foreground/80"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Clear" className="-mr-1 rounded-full p-1 text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            )}
          </label>
          <button onClick={close} className="shrink-0 px-1 text-[16px] font-semibold text-blue-600 dark:text-blue-400">
            Cancel
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-10">
          {!query.trim() ? (
            <>
              {recent.length > 0 && (
                <>
                  <p className="mb-2 mt-2 px-1 text-[12.5px] font-bold uppercase tracking-[0.07em] text-muted-foreground">You looked for</p>
                  <div className="flex flex-wrap gap-2">
                    {recent.map((r) => (
                      <button key={r} onClick={() => setQuery(r)} className="h-10 rounded-full border border-slate-200 bg-card px-4 text-[15px] font-medium dark:border-slate-800">
                        {r}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <p className="mb-2 mt-5 px-1 text-[12.5px] font-bold uppercase tracking-[0.07em] text-muted-foreground">Try</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map((r) => (
                  <button key={r} onClick={() => setQuery(r)} className="h-10 rounded-full border border-slate-200 bg-card px-4 text-[15px] font-medium dark:border-slate-800">
                    {r}
                  </button>
                ))}
              </div>
              <button
                onClick={() => go('/help', 'Help')}
                className="mt-6 flex w-full items-center gap-3 rounded-[20px] border border-slate-200 bg-card p-4 text-left dark:border-slate-800"
              >
                <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] text-white', TILE.blue)}>
                  <CircleHelp className="h-[22px] w-[22px]" />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold">Not sure what to type?</span>
                  <span className="block text-[13px] text-muted-foreground">See common questions in Help</span>
                </span>
                <ChevronRight className="h-5 w-5 text-slate-300" />
              </button>
            </>
          ) : !best ? (
            <div className="mt-10 text-center">
              <p className="font-outfit text-xl font-semibold">Nothing called “{query.trim()}”</p>
              <p className="mt-1 text-muted-foreground">Try a shorter word, or look in Help.</p>
              <button onClick={() => go('/help', 'Help')} className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-blue-600 px-5 font-semibold text-white">
                <CircleHelp className="h-5 w-5" /> Open Help
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={best.go}
                className="mt-1 flex w-full items-center gap-3.5 rounded-[22px] bg-gradient-to-br from-blue-600 to-indigo-600 p-4 text-left text-white shadow-lg shadow-blue-600/25 transition active:scale-[0.99]"
              >
                <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-white/20">
                  <best.icon className="h-7 w-7" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-bold uppercase tracking-[0.08em] text-white/80">Best match</span>
                  <span className="block font-outfit text-[20px] font-bold leading-tight">{best.title}</span>
                  <span className="block truncate text-[13.5px] text-white/85">{best.crumb}</span>
                </span>
                <span className="inline-flex h-11 shrink-0 items-center gap-1 rounded-full bg-white px-4 font-bold text-blue-600">
                  Go <ArrowRight className="h-4 w-4" />
                </span>
              </button>
              {rest.length > 0 && (
                <>
                  <p className="mb-2 mt-5 px-1 text-[12.5px] font-bold uppercase tracking-[0.07em] text-muted-foreground">More results</p>
                  <div className="divide-y divide-slate-100 overflow-hidden rounded-[22px] border border-slate-200/70 bg-card dark:divide-slate-800 dark:border-slate-800">
                    {rest.slice(0, 12).map((r) => (
                      <Row key={r.id} r={r} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default FindAnything;
