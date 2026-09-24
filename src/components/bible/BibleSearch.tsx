import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Clock, Loader2, Search, Sparkles, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  aiResults, formatRef, parseReference, referenceResult, wordResults, type SmartResult,
} from '@/services/bibleSmartSearch';

interface BibleSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (book: string, chapter: number, verse?: number) => void;
  selectedVersion?: string;
}

const RECENT_KEY = 'bible_recent_searches_v2';
const EXAMPLES = [
  'God so loved the world',
  'be strong and courageous',
  "don't worry about tomorrow",
  'plans to prosper you',
  'the Lord is my shepherd',
  'Jesus wept',
  'love is patient',
  'Rom 8:28',
];

const readRecent = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
};

/** Bold the words from the query that appear in a verse (safe, no innerHTML). */
const Marked = ({ text, query }: { text: string; query: string }) => {
  const words = Array.from(new Set(query.toLowerCase().match(/[a-z']{3,}/g) || []));
  if (!words.length) return <>{text}</>;
  const re = new RegExp(`\\b(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i} className="font-semibold text-foreground">{part}</strong> : <span key={i}>{part}</span>,
      )}
    </>
  );
};

const ResultCard = ({
  result, query, highlight, onOpen,
}: { result: SmartResult; query: string; highlight?: boolean; onOpen: (r: SmartResult) => void }) => (
  <button
    onClick={() => onOpen(result)}
    className={cn(
      'w-full rounded-2xl border p-4 text-left transition active:scale-[0.99]',
      highlight
        ? 'border-blue-200 bg-blue-50/70 hover:bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40'
        : 'border-border/70 bg-card hover:border-blue-200 hover:bg-muted/40 dark:hover:border-blue-900',
    )}
  >
    <div className="flex items-center justify-between gap-2">
      <p className={cn('font-semibold text-blue-700 dark:text-blue-300', highlight ? 'text-lg' : 'text-[15px]')}>{formatRef(result)}</p>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </div>
    <p className={cn('mt-1.5 font-serif leading-relaxed text-foreground/85', highlight ? 'text-[17px]' : 'line-clamp-3 text-[15px]')}>
      {result.source === 'words' ? <Marked text={result.text} query={query} /> : result.text}
    </p>
    {result.reason && (
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-blue-500" /> {result.reason}
      </p>
    )}
  </button>
);

export const BibleSearch = ({ isOpen, onClose, onNavigate, selectedVersion }: BibleSearchProps) => {
  const version = selectedVersion || 'de4e12af7f28f599-02';
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [reference, setReference] = useState<SmartResult | null>(null);
  const [ai, setAi] = useState<SmartResult[]>([]);
  const [words, setWords] = useState<SmartResult[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [loadingWords, setLoadingWords] = useState(false);
  const [recent, setRecent] = useState<string[]>(readRecent);
  const inputRef = useRef<HTMLInputElement>(null);
  const runId = useRef(0);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isOpen]);

  // Instant: typed references ("jn 3:16") resolve as you type
  useEffect(() => {
    const ref = parseReference(query);
    if (!ref) {
      setReference(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const r = await referenceResult(ref, version);
      if (!cancelled) setReference(r);
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, version]);

  const run = useCallback(async (text: string) => {
    const q = text.trim();
    if (q.length < 2) return;
    const id = ++runId.current;
    setSubmitted(q);
    setAi([]);
    setWords([]);
    setLoadingAi(true);
    setLoadingWords(true);

    const next = [q, ...readRecent().filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, 8);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setRecent(next);

    aiResults(q, version)
      .then((r) => id === runId.current && setAi(r))
      .finally(() => id === runId.current && setLoadingAi(false));
    wordResults(q, version)
      .then((r) => id === runId.current && setWords(r))
      .finally(() => id === runId.current && setLoadingWords(false));
  }, [version]);

  // Search automatically once the person pauses typing
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3 || q === submitted) return;
    if (parseReference(q)) return; // references are instant; no need to search
    const t = setTimeout(() => run(q), 650);
    return () => clearTimeout(t);
  }, [query, submitted, run]);

  const open = (r: SmartResult) => {
    onNavigate(r.book, r.chapter, r.verseStart || undefined);
    onClose();
  };

  const shownKeys = useMemo(() => new Set([reference?.key, ...ai.map((r) => r.key)].filter(Boolean)), [reference, ai]);
  const wordOnly = words.filter((w) => !shownKeys.has(w.key));
  const best = ai[0];
  const others = ai.slice(1);
  const hasQuery = submitted.length > 0 && query.trim().length > 0;
  const nothing = hasQuery && !loadingAi && !loadingWords && !reference && ai.length === 0 && wordOnly.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[100dvh] w-full max-w-none flex-col gap-0 overflow-hidden rounded-none border-none p-0 sm:h-[85vh] sm:max-w-2xl sm:rounded-3xl sm:border [&>button]:hidden">
        <DialogTitle className="sr-only">Search the Bible</DialogTitle>
        <DialogDescription className="sr-only">Type a verse, reference, or what you remember and we'll find it.</DialogDescription>

        {/* Search bar */}
        <div className="border-b border-border/60 px-3 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:pt-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (reference) open(reference);
                    else run(query);
                  }
                }}
                enterKeyHint="search"
                placeholder="Search a verse, word or what you remember…"
                className="h-12 w-full rounded-2xl bg-muted/70 pl-11 pr-10 text-[16px] text-foreground outline-none ring-blue-500/30 placeholder:text-muted-foreground focus:ring-2"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    setSubmitted('');
                    setAi([]);
                    setWords([]);
                    inputRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                  aria-label="Clear"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button onClick={onClose} className="h-12 rounded-full px-3 font-medium text-blue-600 dark:text-blue-400">
              Cancel
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-3">
          {/* Instant reference */}
          {reference && (
            <div className="mb-4">
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Go to</p>
              <ResultCard result={reference} query={query} highlight onOpen={open} />
            </div>
          )}

          {!hasQuery && !reference && (
            <div className="space-y-6 px-1 pt-2">
              <div className="flex items-start gap-3 rounded-2xl bg-blue-50/70 p-4 dark:bg-blue-950/40">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                <p className="text-sm text-foreground/80">
                  Type what you remember — even if the words aren't exact — and we'll find the verse.
                  You can also type a reference like <span className="font-semibold">jn 3 16</span>.
                </p>
              </div>
              {recent.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent</p>
                    <button
                      onClick={() => {
                        localStorage.removeItem(RECENT_KEY);
                        setRecent([]);
                      }}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {recent.map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          setQuery(r);
                          run(r);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left text-foreground hover:bg-muted"
                      >
                        <Clock className="h-4 w-4 text-muted-foreground" /> {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Try</p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => {
                        setQuery(ex);
                        if (!parseReference(ex)) run(ex);
                      }}
                      className="rounded-full bg-muted px-3.5 py-2 text-sm text-foreground hover:bg-muted/70"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {hasQuery && (
            <>
              {loadingAi && ai.length === 0 && (
                <div className="mb-4 space-y-3">
                  <p className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Finding the verse you mean…
                  </p>
                  <div className="h-28 animate-pulse rounded-2xl bg-muted" />
                  <div className="h-20 animate-pulse rounded-2xl bg-muted" />
                </div>
              )}

              {best && (
                <div className="mb-4">
                  <p className="mb-2 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-blue-500" /> Best match
                  </p>
                  <ResultCard result={best} query={submitted} highlight onOpen={open} />
                </div>
              )}

              {others.length > 0 && (
                <div className="mb-5">
                  <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">You might also mean</p>
                  <div className="space-y-2">
                    {others.map((r) => <ResultCard key={r.key} result={r} query={submitted} onOpen={open} />)}
                  </div>
                </div>
              )}

              {(wordOnly.length > 0 || loadingWords) && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5" /> Verses containing “{submitted}”
                    {loadingWords && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  </p>
                  <div className="space-y-2">
                    {wordOnly.map((r) => <ResultCard key={r.key} result={r} query={submitted} onOpen={open} />)}
                  </div>
                </div>
              )}

              {nothing && (
                <div className="flex flex-col items-center px-6 py-14 text-center">
                  <Search className="h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-3 font-medium text-foreground">No verses found</p>
                  <p className="mt-1 text-sm text-muted-foreground">Try describing it differently, or use a few words you remember.</p>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BibleSearch;
