import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, Headphones, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { bibleBooks } from "./BibleBookList";
import { normalizeBookApiName } from "./bookUtils";
import { BOOK_ABBR, BOOK_GROUPS, BOOK_SUMMARY, GROUP_COLORS, groupOfBook, type Testament } from "./bookGroups";
import { offlineAudioService } from "@/services/offlineAudioService";

interface BiblePassagePickerProps {
  /** The book whose chapters are shown first */
  initialBook: string;
  /** Where the reader is now: marked in the lists */
  currentBook?: string;
  currentChapter?: number;
  onSelect: (book: string, chapter: number) => void;
  onCancel: () => void;
  onHistory: () => void;
}

/** Books and chapters side by side from this width (a tablet on its side); one after the other below it. */
const SPLIT_MIN_WIDTH = 640;

const allBooks = [...bibleBooks["Old Testament"], ...bibleBooks["New Testament"]];
const bookInfo = (apiName: string) => allBooks.find((b) => b.apiName === apiName);

/** Chapters opened recently (the reading history keeps the last 50). */
const readChapters = () => {
  try {
    const history: { book: string; chapter: number }[] = JSON.parse(localStorage.getItem("bibleReadingHistory") || "[]");
    return new Set(history.map((h) => `${normalizeBookApiName(h.book)}:${h.chapter}`));
  } catch {
    return new Set<string>();
  }
};

const matches = (name: string, abbr: string, query: string) => {
  const n = name.toLowerCase();
  const q = query.toLowerCase();
  return n.includes(q) || n.replace(/\s/g, "").includes(q.replace(/\s/g, "")) || abbr.toLowerCase().startsWith(q);
};

/** "John 3" → the John 3 passage; "1 John" → just the book. */
const parseSearch = (text: string) => {
  const withChapter = /^(.*[a-z].*?)\s*(\d+)$/i.exec(text.trim());
  const name = (withChapter ? withChapter[1] : text).trim();
  const found = name ? allBooks.find((b) => matches(b.name, BOOK_ABBR[b.apiName] ?? "", name)) : undefined;
  const chapter = withChapter ? Number(withChapter[2]) : 0;
  return { name, book: found, chapter: found && chapter >= 1 && chapter <= found.chapters ? chapter : 0 };
};

export const BiblePassagePicker = ({
  initialBook,
  currentBook,
  currentChapter,
  onSelect,
  onCancel,
  onHistory,
}: BiblePassagePickerProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const chaptersRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  const [focusBook, setFocusBook] = useState(() => {
    const book = normalizeBookApiName(initialBook || "genesis");
    return bookInfo(book) ? book : "genesis";
  });
  // Narrow screens: opened from a chapter, so its book's chapters come first
  const [step, setStep] = useState<"books" | "chapters">("chapters");
  const [testament, setTestament] = useState<Testament>(() => groupOfBook(focusBook)?.testament ?? "old");
  const [query, setQuery] = useState("");

  const nowBook = currentBook ? normalizeBookApiName(currentBook) : undefined;
  const read = useMemo(readChapters, []);
  const offline = useMemo(() => new Set(offlineAudioService.list().map((d) => `${d.book}:${d.chapter}`)), []);

  // Side by side only when there's room for both
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => setWide(el.clientWidth >= SPLIT_MIN_WIDTH);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const showBooks = wide || step === "books";
  const showChapters = wide || step === "chapters";

  // Keep the chosen book in view in the list
  useEffect(() => {
    const list = listRef.current;
    const row = list?.querySelector<HTMLElement>(`[data-book="${focusBook}"]`);
    if (!showBooks || query || !list || !row) return;
    // Scroll only the list (scrollIntoView would move the page around it too)
    const offset = row.getBoundingClientRect().top - list.getBoundingClientRect().top;
    list.scrollTop += offset - list.clientHeight / 2 + row.offsetHeight / 2;
    // Only when the list appears (or the tablet turns) or the testament changes, not on every tap
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBooks, wide, testament]);

  const search = useMemo(() => parseSearch(query), [query]);

  const groups = useMemo(() => {
    const q = search.name;
    return BOOK_GROUPS.filter((g) => (q ? true : g.testament === testament))
      .map((g) => ({
        ...g,
        books: g.books.filter((b) => !q || matches(bookInfo(b)?.name ?? b, BOOK_ABBR[b] ?? "", q)),
      }))
      .filter((g) => g.books.length > 0);
  }, [search.name, testament]);

  const pickBook = (apiName: string) => {
    setFocusBook(apiName);
    setTestament(groupOfBook(apiName)?.testament ?? "old");
    if (!wide) setStep("chapters");
    chaptersRef.current?.scrollTo({ top: 0 });
  };

  // Enter in the search: "John 3" opens the chapter; a book name opens the first match
  const submitSearch = () => {
    if (!search.book) return;
    if (search.chapter) {
      onSelect(search.book.apiName, search.chapter);
      return;
    }
    setQuery("");
    pickBook(search.book.apiName);
  };

  const book = bookInfo(focusBook)!;
  const group = groupOfBook(focusBook);
  const colors = GROUP_COLORS[group?.key ?? "law"];
  const chapters = Array.from({ length: book.chapters }, (_, i) => i + 1);
  const isNow = (c: number) => focusBook === nowBook && c === currentChapter;
  const hasRead = chapters.some((c) => !isNow(c) && read.has(`${focusBook}:${c}`));
  const hasOffline = chapters.some((c) => offline.has(`${focusBook}:${c}`));

  const linkClass = "inline-flex items-center gap-0.5 rounded-lg px-1 py-1.5 text-[15px] font-medium text-primary transition active:opacity-60";

  const bookList = (
    <div className="flex flex-col">
      {/* Search and testament switch stay at the top while the list scrolls */}
      <div className="sticky -top-1 z-10 -mx-4 bg-background px-4 pb-1 pt-1">
        <div className="flex h-11 items-center gap-2.5 rounded-2xl bg-muted px-3.5 text-muted-foreground focus-within:ring-2 focus-within:ring-primary/40">
          <Search className="h-[18px] w-[18px] shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitSearch()}
            placeholder="Search books"
            aria-label="Search books"
            enterKeyHint="go"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/80"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search" className="-mr-1 rounded-full p-1 active:opacity-60">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
  
        {!query && (
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1" role="tablist">
            {(["old", "new"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={testament === t}
                onClick={() => setTestament(t)}
                className={cn(
                  "h-9 rounded-xl text-[14px] font-medium transition",
                  testament === t ? "bg-background font-semibold text-foreground shadow-sm dark:bg-white/10" : "text-muted-foreground",
                )}
              >
                {t === "old" ? "Old" : "New"}
                {!wide && " Testament"}
                <span className="ml-1 font-medium text-muted-foreground/70">{t === "old" ? 39 : 27}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {search.book && search.chapter > 0 && (
        <button
          onClick={submitSearch}
          className="mt-3 flex h-12 items-center justify-between rounded-2xl bg-primary px-4 text-[15px] font-semibold text-primary-foreground shadow-[0_6px_16px_rgba(59,130,246,0.3)] transition active:scale-[0.98]"
        >
          Go to {search.book.name} {search.chapter}
          <ArrowRight className="h-[18px] w-[18px]" />
        </button>
      )}

      {groups.length === 0 && <p className="px-2 py-10 text-center text-[14.5px] text-muted-foreground">No book called “{search.name}”</p>}

      {groups.map((g) => (
        <div key={g.key} className="mt-4">
          <h3 className="flex items-center gap-2 px-2.5 pb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            <span className={cn("h-2 w-2 rounded-full", GROUP_COLORS[g.key].dot)} />
            {g.label}
          </h3>
          <div className="flex flex-col gap-0.5">
            {g.books.map((apiName) => {
              const info = bookInfo(apiName)!;
              const focused = apiName === focusBook;
              return (
                <button
                  key={apiName}
                  data-book={apiName}
                  onClick={() => pickBook(apiName)}
                  aria-label={`${info.name}, ${info.chapters} ${info.chapters === 1 ? "chapter" : "chapters"}`}
                  aria-pressed={focused}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition active:scale-[0.98]",
                    focused ? "bg-primary/10 dark:bg-primary/15" : "hover:bg-muted",
                  )}
                >
                  <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-[10px] font-outfit text-[12.5px] font-bold", GROUP_COLORS[g.key].badge)}>
                    {BOOK_ABBR[apiName]}
                  </span>
                  <span className={cn("flex-1 truncate text-[15px]", focused ? "font-semibold text-blue-700 dark:text-blue-300" : "font-medium text-foreground")}>
                    {info.name}
                  </span>
                  {apiName === nowBook && !focused && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label="Reading now" />}
                  <span className={cn("text-[12.5px] tabular-nums", focused ? "text-primary" : "text-muted-foreground/70")}>{info.chapters}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  const chapterPanel = (
    <div>
      <div className={cn("relative overflow-hidden rounded-[22px] p-5", colors.tint)}>
        <p className={cn("text-[11.5px] font-bold uppercase tracking-[0.12em]", colors.ink)}>
          {group?.testament === "new" ? "New Testament" : "Old Testament"}
        </p>
        <h2 className="relative mt-1 font-serif text-[38px] leading-tight text-foreground">{book.name}</h2>
        <p className="relative mt-1.5 max-w-[46ch] text-[14.5px] leading-relaxed text-muted-foreground">{BOOK_SUMMARY[focusBook]}</p>
        <span className="relative mt-3.5 inline-flex rounded-full border border-border bg-background px-3 py-1.5 text-[12.5px] font-semibold text-foreground">
          {book.chapters} {book.chapters === 1 ? "chapter" : "chapters"}
        </span>
        <span aria-hidden className={cn("pointer-events-none absolute -bottom-10 -right-1 select-none font-serif text-[170px] leading-none opacity-[0.09]", colors.ink)}>
          {book.name.replace(/^\d\s*/, "").charAt(0)}
        </span>
      </div>

      <div className="mb-3 mt-5 flex items-center justify-between gap-3 px-0.5">
        <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Chapters</h3>
        <div className="flex items-center gap-3.5 text-[12px] text-muted-foreground">
          {focusBook === nowBook && (
            <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px] bg-primary" />Now</span>
          )}
          {hasRead && (
            <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px] border-[1.5px] border-primary bg-primary/10" />Read</span>
          )}
          {hasOffline && (
            <span className="inline-flex items-center gap-1"><Headphones className="h-3 w-3" />Offline</span>
          )}
        </div>
      </div>

      <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${wide ? 62 : 56}px, 1fr))` }}>
        {chapters.map((c) => {
          const now = isNow(c);
          const wasRead = !now && read.has(`${focusBook}:${c}`);
          return (
            <button
              key={c}
              onClick={() => onSelect(focusBook, c)}
              aria-label={`${book.name} chapter ${c}`}
              aria-current={now ? "true" : undefined}
              className={cn(
                "relative grid aspect-square place-items-center rounded-[15px] font-outfit text-[18px] transition active:scale-95",
                now
                  ? "bg-primary font-bold text-primary-foreground shadow-[0_6px_16px_rgba(59,130,246,0.35)]"
                  : wasRead
                    ? "bg-primary/10 font-medium text-blue-700 dark:bg-primary/15 dark:text-blue-300"
                    : "border border-border bg-card font-medium text-foreground shadow-sm hover:border-primary/40",
              )}
            >
              {offline.has(`${focusBook}:${c}`) && (
                <Headphones className={cn("absolute right-1.5 top-1.5 h-3 w-3", now ? "text-white/80" : "text-muted-foreground/70")} />
              )}
              {c}
              {wasRead && <span className="absolute bottom-[7px] h-1 w-1 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );

  const title = wide ? "Choose a passage" : step === "chapters" ? book.name : "Books";

  return (
    <div ref={rootRef} className="flex min-h-0 flex-1 flex-col overscroll-contain">
      {/* Header */}
      <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-4 pb-2 pt-3" style={{ touchAction: "none" }}>
        <div className="justify-self-start">
          {!wide && step === "chapters" ? (
            <button onClick={() => setStep("books")} className={linkClass}>
              <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
              Books
            </button>
          ) : (
            <button onClick={onCancel} className={linkClass}>Cancel</button>
          )}
        </div>
        <h1 className="max-w-[46vw] truncate font-outfit text-[19px] font-semibold tracking-[-0.01em] text-foreground">{title}</h1>
        <div className="justify-self-end">
          {!wide && step === "chapters" ? (
            <button onClick={onCancel} className={linkClass}>Cancel</button>
          ) : (
            <button onClick={onHistory} className={linkClass}>History</button>
          )}
        </div>
      </div>

      {wide ? (
        <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: "minmax(260px, 340px) 1fr" }}>
          <div ref={listRef} className="min-h-0 overflow-y-auto overscroll-contain border-r border-border px-4 pb-10 pt-1">
            {bookList}
          </div>
          <div ref={chaptersRef} className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-10 pt-1">
            {chapterPanel}
          </div>
        </div>
      ) : (
        <div
          ref={showBooks ? listRef : chaptersRef}
          key={step}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-32 pt-1 md:pb-10"
        >
          {showChapters ? chapterPanel : bookList}
        </div>
      )}
    </div>
  );
};

export default BiblePassagePicker;
