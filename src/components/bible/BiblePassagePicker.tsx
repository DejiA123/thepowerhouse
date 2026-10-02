import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronRight, Clock, MoreHorizontal, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { bibleBooks } from "./BibleBookList";
import { normalizeBookApiName } from "./bookUtils";
import { BOOK_ABBR } from "./bookGroups";

interface BiblePassagePickerProps {
  /** The book that opens unfolded */
  initialBook: string;
  /** Where the reader is now: highlighted in the list */
  currentBook?: string;
  currentChapter?: number;
  onSelect: (book: string, chapter: number) => void;
  onCancel: () => void;
  onHistory: () => void;
}

const OLD = bibleBooks["Old Testament"];
const NEW = bibleBooks["New Testament"];
const allBooks = [...OLD, ...NEW];
const bookInfo = (apiName: string) => allBooks.find((b) => b.apiName === apiName);

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

/** The last passages opened (newest first, one per chapter). */
const recentPassages = () => {
  try {
    const history: { book: string; chapter: number; timestamp?: number }[] = JSON.parse(localStorage.getItem("bibleReadingHistory") || "[]");
    const seen = new Set<string>();
    return history
      .map((h) => ({ ...h, book: normalizeBookApiName(h.book) }))
      .filter((h) => bookInfo(h.book) && !seen.has(`${h.book}:${h.chapter}`) && seen.add(`${h.book}:${h.chapter}`))
      .slice(0, 10);
  } catch {
    return [];
  }
};

const when = (timestamp?: number) => {
  if (!timestamp) return "";
  const day = 86_400_000;
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  if (timestamp >= startOfToday) return "Today";
  if (timestamp >= startOfToday - day) return "Yesterday";
  const days = Math.ceil((startOfToday - timestamp) / day);
  return days < 7 ? `${days} days ago` : new Date(timestamp).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

/**
 * Choose a passage: every book in one list (the Old Testament, then the New).
 * Tapping a book unfolds its chapters right there; the book being read opens
 * unfolded, with its chapter marked.
 */
export const BiblePassagePicker = ({ initialBook, currentBook, currentChapter, onSelect, onCancel, onHistory }: BiblePassagePickerProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nowBook = currentBook ? normalizeBookApiName(currentBook) : undefined;
  const [open, setOpen] = useState<string | null>(() => {
    const book = normalizeBookApiName(initialBook || nowBook || "genesis");
    return bookInfo(book) ? book : null;
  });
  const [query, setQuery] = useState("");
  const recents = useMemo(recentPassages, []);
  const search = useMemo(() => parseSearch(query), [query]);

  const filter = (books: typeof allBooks) =>
    search.name ? books.filter((b) => matches(b.name, BOOK_ABBR[b.apiName] ?? "", search.name)) : books;
  const oldShown = filter(OLD);
  const newShown = filter(NEW);
  const onlyMatch = search.name && oldShown.length + newShown.length === 1 ? (oldShown[0] ?? newShown[0]).apiName : null;
  const unfolded = onlyMatch ?? (search.name ? null : open);

  // Bring a book (and its chapters) to the top of the list
  const scrollToBook = (apiName: string, smooth: boolean) => {
    const box = scrollRef.current;
    const row = box?.querySelector<HTMLElement>(`[data-book="${apiName}"]`);
    if (!box || !row) return;
    const top = row.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 6;
    box.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
  };

  // Opening: the book being read is at the top, already unfolded
  useLayoutEffect(() => {
    if (open) scrollToBook(open, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickBook = (apiName: string) => {
    const info = bookInfo(apiName)!;
    // One-chapter books (Obadiah, Jude…) open straight away
    if (info.chapters === 1) {
      onSelect(apiName, 1);
      return;
    }
    if (search.name) setQuery("");
    setOpen((current) => (current === apiName && !search.name ? null : apiName));
  };

  useEffect(() => {
    if (open && !search.name) requestAnimationFrame(() => scrollToBook(open, true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Enter in the search: "John 3" opens the chapter; a book name unfolds it
  const submitSearch = () => {
    if (!search.book) return;
    if (search.chapter) {
      onSelect(search.book.apiName, search.chapter);
      return;
    }
    pickBook(search.book.apiName);
  };

  const bookRow = (info: (typeof allBooks)[number]) => {
    const isOpen = unfolded === info.apiName;
    const isNow = info.apiName === nowBook;
    return (
      <div key={info.apiName} data-book={info.apiName} className={cn("transition-colors", isOpen && "bg-primary/[0.07] dark:bg-primary/[0.12]")}>
        <button
          onClick={() => pickBook(info.apiName)}
          aria-expanded={info.chapters > 1 ? isOpen : undefined}
          aria-label={`${info.name}, ${info.chapters} ${info.chapters === 1 ? "chapter" : "chapters"}`}
          className={cn(
            "flex h-[54px] w-full items-center gap-3 px-5 text-left transition active:bg-muted/70",
            !isOpen && isNow && "bg-primary/[0.07] dark:bg-primary/[0.12]",
          )}
        >
          <span
            className={cn(
              "flex-1 truncate text-[18px] tracking-[-0.005em]",
              isOpen || isNow ? "font-semibold text-primary" : "text-foreground",
            )}
          >
            {info.name}
          </span>
          <span className={cn("text-[13.5px] font-medium tabular-nums", isOpen || isNow ? "text-primary" : "text-muted-foreground/70")}>
            {info.chapters}
          </span>
        </button>
        {isOpen && (
          <div
            className="grid gap-2.5 px-4 pb-5 pt-1 animate-in fade-in slide-in-from-top-1 duration-200"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(46px, 1fr))" }}
          >
            {Array.from({ length: info.chapters }, (_, i) => i + 1).map((c) => {
              const here = isNow && c === currentChapter;
              return (
                <button
                  key={c}
                  onClick={() => onSelect(info.apiName, c)}
                  aria-label={`${info.name} chapter ${c}`}
                  aria-current={here ? "true" : undefined}
                  className={cn(
                    "grid aspect-square place-items-center rounded-[14px] font-outfit text-[17.5px] transition active:scale-95",
                    here
                      ? "bg-primary font-bold text-primary-foreground shadow-[0_6px_14px_rgba(37,99,235,0.35)]"
                      : "border border-border bg-card font-medium text-foreground shadow-sm hover:border-primary/40",
                  )}
                >
                  {c}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const roundButton = "grid h-10 w-10 place-items-center rounded-full bg-muted text-foreground transition active:scale-90";

  return (
    <div className="flex min-h-0 flex-1 flex-col overscroll-contain pb-[calc(env(safe-area-inset-bottom)+64px)] md:pb-0">
      {/* Header */}
      <div className="grid shrink-0 grid-cols-[40px_1fr_40px] items-center px-4 pb-2 pt-3" style={{ touchAction: "none" }}>
        <button onClick={onCancel} className={roundButton} aria-label="Close">
          <X className="h-5 w-5" strokeWidth={2.2} />
        </button>
        <h1 className="text-center font-outfit text-[18px] font-semibold tracking-[-0.01em] text-foreground">Books</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={roundButton} aria-label="More">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5">
            <DropdownMenuItem onClick={onHistory} className="gap-2.5 rounded-xl p-2.5 text-[15px]">
              <Clock className="h-4 w-4" /> Reading history
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="shrink-0 px-4 pb-2">
        <div className="flex h-11 items-center gap-2.5 rounded-[14px] bg-muted px-3.5 text-muted-foreground focus-within:ring-2 focus-within:ring-primary/40">
          <Search className="h-[18px] w-[18px] shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitSearch()}
            placeholder="Search books or “John 3”"
            aria-label="Search books"
            enterKeyHint="go"
            className="min-w-0 flex-1 bg-transparent text-[16px] text-foreground outline-none placeholder:text-muted-foreground/80"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search" className="-mr-1 rounded-full p-1 active:opacity-60">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {search.book && search.chapter > 0 && (
          <button
            onClick={submitSearch}
            className="mt-2.5 flex h-12 w-full items-center justify-between rounded-2xl bg-primary px-4 text-[15px] font-semibold text-primary-foreground shadow-[0_6px_16px_rgba(59,130,246,0.3)] transition active:scale-[0.98]"
          >
            Go to {search.book.name} {search.chapter}
            <ArrowRight className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>

      {/* Every book in one list: the Old Testament, a line, the New */}
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-3xl pb-6">
          {oldShown.map(bookRow)}
          {oldShown.length > 0 && newShown.length > 0 && <div className="mx-5 my-3 h-px bg-border" role="separator" />}
          {newShown.map(bookRow)}
          {oldShown.length + newShown.length === 0 && (
            <p className="px-6 py-12 text-center text-[15px] text-muted-foreground">No book called “{search.name}”</p>
          )}
        </div>
      </div>

      {/* Recently read */}
      {recents.length > 0 && !query && (
        <div className="shrink-0 border-t border-border bg-background pb-3 pt-2.5">
          <button onClick={onHistory} className="mb-2 inline-flex items-center gap-0.5 px-5 text-[15px] font-bold text-foreground active:opacity-60">
            Recents <ChevronRight className="h-4 w-4" strokeWidth={2.6} />
          </button>
          <div className="flex gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {recents.map((r) => (
              <button
                key={`${r.book}:${r.chapter}`}
                onClick={() => onSelect(r.book, r.chapter)}
                className="shrink-0 rounded-[14px] bg-muted px-3.5 py-2 text-left transition active:scale-[0.97]"
              >
                <span className="block whitespace-nowrap text-[15px] font-semibold text-foreground">
                  {bookInfo(r.book)!.name} {r.chapter}
                </span>
                <span className="block text-[12px] text-muted-foreground">{when(r.timestamp) || "Recently"}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BiblePassagePicker;
