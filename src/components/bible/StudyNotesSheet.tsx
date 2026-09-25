import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, GraduationCap, RotateCcw, WifiOff } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Segmented } from '@/components/page/PageKit';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  STUDY_NOTES_ATTRIBUTION, linkReferences, splitLemma, studyNotesService, tecartaUrl, type StudyChapter,
} from '@/services/studyNotesService';
import { formatBookDisplayName, normalizeBookApiName } from './bookUtils';

type View = 'notes' | 'about';

interface StudyNotesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: string;
  chapter: number;
  /** Scroll to the note for this verse when opening */
  focusVerse?: number | null;
  onNavigate: (book: string, chapter: number, verse?: number) => void;
}

/**
 * Study Bible notes for the chapter being read: verse-by-verse notes and the
 * book introduction (Tyndale Open Study Notes).
 */
const StudyNotesSheet = ({ open, onOpenChange, book, chapter, focusVerse, onNavigate }: StudyNotesSheetProps) => {
  const isMobile = useIsMobile();
  const apiBook = normalizeBookApiName(book);
  const name = formatBookDisplayName(apiBook);
  const [data, setData] = useState<StudyChapter | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'none' | 'error'>('loading');
  const [view, setView] = useState<View>('notes');
  const [attempt, setAttempt] = useState(0);
  const [showFullIntro, setShowFullIntro] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setState('loading');
    setShowFullIntro(false);
    studyNotesService
      .getChapter(apiBook, chapter)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setState(result ? 'ready' : 'none');
        setView(result && result.notes.length === 0 ? 'about' : 'notes');
      })
      .catch(() => !cancelled && setState('error'));
    return () => {
      cancelled = true;
    };
  }, [open, apiBook, chapter, attempt]);

  // Bring the note for the tapped verse into view
  useEffect(() => {
    if (!open || state !== 'ready' || view !== 'notes' || !focusVerse || !data) return;
    const target = [...data.notes].reverse().find((n) => n.verse <= focusVerse) ?? data.notes[0];
    if (!target) return;
    const t = setTimeout(() => {
      const el = scrollRef.current?.querySelector<HTMLElement>(`[data-note-verse="${target.verse}"]`);
      if (!el) return;
      el.scrollIntoView({ block: 'start', behavior: 'smooth' });
      el.classList.add('verse-flash');
      setTimeout(() => el.classList.remove('verse-flash'), 2600);
    }, 350);
    return () => clearTimeout(t);
  }, [open, state, view, focusVerse, data]);

  const go = (b: string, c: number, v?: number) => {
    onOpenChange(false);
    onNavigate(b, c, v);
  };

  const summary = useMemo(() => parseSummary(data?.summary || ''), [data?.summary]);
  const intro = useMemo(() => (data?.introduction || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean), [data?.introduction]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className="flex h-[92dvh] w-full flex-col gap-0 rounded-t-[28px] p-0 data-[state=open]:duration-300 sm:h-full sm:max-w-lg sm:rounded-none [&>button]:right-5 [&>button]:top-5"
      >
        <div className="shrink-0 px-5 pb-3 pt-6">
          <p className="flex items-center gap-1.5 text-[12.5px] font-bold uppercase tracking-[0.08em] text-amber-600 dark:text-amber-400">
            <GraduationCap className="h-4 w-4" /> Study notes
          </p>
          <SheetTitle className="mt-0.5 font-outfit text-[26px] font-extrabold tracking-tight">
            {name} {chapter}
          </SheetTitle>
          <SheetDescription className="sr-only">Study notes and book introduction for {name} {chapter}</SheetDescription>
        </div>

        {state === 'ready' && data && (
          <div className="shrink-0 px-4">
            <Segmented<View>
              value={view}
              onChange={setView}
              className="mb-2"
              options={[
                { value: 'notes', label: `Notes${data.notes.length ? ` · ${data.notes.length}` : ''}` },
                { value: 'about', label: `About ${name}` },
              ]}
            />
          </div>
        )}

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-2">
          {state === 'loading' && (
            <div className="space-y-5 pt-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
                  <div className="h-3.5 w-full animate-pulse rounded bg-muted" />
                  <div className="h-3.5 w-11/12 animate-pulse rounded bg-muted" />
                  <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          )}

          {state === 'error' && (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <WifiOff className="h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-semibold text-foreground">Couldn't load study notes</p>
              <p className="mt-1 text-sm text-muted-foreground">Check your connection. Chapters you've opened before work offline.</p>
              <button
                onClick={() => setAttempt((a) => a + 1)}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background"
              >
                <RotateCcw className="h-4 w-4" /> Try again
              </button>
            </div>
          )}

          {state === 'none' && (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <GraduationCap className="h-8 w-8 text-muted-foreground/60" />
              <p className="mt-3 font-semibold text-foreground">No study notes for {name} {chapter}</p>
              <p className="mt-1 text-sm text-muted-foreground">Try another chapter.</p>
            </div>
          )}

          {state === 'ready' && data && view === 'notes' && (
            data.notes.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No verse notes for this chapter. See “About {name}”.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.notes.map((note, i) => (
                  <article key={i} data-note-verse={note.verse} className="scroll-mt-2 rounded-xl py-4 first:pt-2">
                    <button
                      onClick={() => go(apiBook, chapter, note.verse)}
                      className="mb-1.5 inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[13px] font-bold text-amber-700 transition hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300"
                      aria-label={`Go to ${name} ${chapter}:${note.verse}`}
                    >
                      {note.label}
                    </button>
                    {note.paragraphs.map((p, j) => (
                      <NoteParagraph key={j} text={p} book={apiBook} onRef={go} />
                    ))}
                  </article>
                ))}
              </div>
            )
          )}

          {state === 'ready' && data && view === 'about' && (
            <div className="pb-2">
              {summary.title && <h3 className="font-outfit text-xl font-bold text-foreground">{summary.title}</h3>}
              {summary.facts.length > 0 && (
                <dl className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/70 bg-card dark:divide-slate-800 dark:border-slate-800">
                  {summary.facts.map((f) => (
                    <div key={f.label} className="px-4 py-3">
                      <dt className="text-[12px] font-bold uppercase tracking-[0.07em] text-muted-foreground">{f.label}</dt>
                      <dd className="mt-0.5 text-[15px] leading-relaxed text-foreground">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {intro.length > 0 && (
                <div className="mt-5 space-y-3">
                  {(showFullIntro ? intro : intro.slice(0, 3)).map((p, i) =>
                    isHeading(p) ? (
                      <h4 key={i} className="pt-2 font-outfit text-base font-bold text-foreground">{p}</h4>
                    ) : (
                      <p key={i} className="font-serif text-[16px] leading-[1.75] text-foreground/90">
                        <Linked text={p} book={apiBook} onRef={go} />
                      </p>
                    ),
                  )}
                  {intro.length > 3 && (
                    <button onClick={() => setShowFullIntro((s) => !s)} className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {showFullIntro ? 'Show less' : 'Read the full introduction'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {state !== 'loading' && (
            <footer className="mt-6 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <a
                href={tecartaUrl(name, chapter)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3 transition hover:bg-muted"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-foreground">Open {name} {chapter} in Tecarta</span>
                  <span className="block text-[12.5px] text-muted-foreground">For study Bibles you own there, like the Life Application Study Bible</span>
                </span>
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
              </a>
              <p className="px-1 text-[11.5px] leading-relaxed text-muted-foreground">
                <a href={STUDY_NOTES_ATTRIBUTION.website} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  {STUDY_NOTES_ATTRIBUTION.name}
                </a>{' '}
                © {STUDY_NOTES_ATTRIBUTION.holder}, used under{' '}
                <a href={STUDY_NOTES_ATTRIBUTION.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  {STUDY_NOTES_ATTRIBUTION.license}
                </a>
                .
              </p>
            </footer>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

const NoteParagraph = ({ text, book, onRef }: { text: string; book: string; onRef: (b: string, c: number, v?: number) => void }) => {
  const { lemma, rest } = splitLemma(text);
  return (
    <p className="mt-1.5 text-[15.5px] leading-[1.7] text-foreground/90">
      {lemma && <strong className="font-semibold text-foreground">{lemma}: </strong>}
      <Linked text={rest} book={book} onRef={onRef} />
    </p>
  );
};

/** Text with its Bible references turned into links. */
const Linked = ({ text, book, onRef }: { text: string; book: string; onRef: (b: string, c: number, v?: number) => void }) => (
  <>
    {linkReferences(text, book).map((seg, i) =>
      seg.kind === 'text' ? (
        <Fragment key={i}>{seg.text}</Fragment>
      ) : (
        <button
          key={i}
          onClick={() => onRef(seg.book, seg.chapter, seg.verse)}
          className="font-medium text-blue-600 underline decoration-blue-600/30 underline-offset-2 hover:decoration-blue-600 dark:text-blue-400"
        >
          {seg.text}
        </button>
      ),
    )}
  </>
);

/** Short lines such as "Setting" or "Summary" are sub-headings in the introduction. */
const isHeading = (p: string) => p.length < 48 && !/[.!?:;,]$/.test(p) && !/\d:\d/.test(p);

/** "The Gospel of John\n\nPurpose\n\nTo generate…\n\nAuthor\n\n…" → title + facts */
function parseSummary(raw: string): { title: string; facts: { label: string; value: string }[] } {
  const parts = raw.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return { title: '', facts: [] };
  const [title, ...rest] = parts;
  const facts: { label: string; value: string }[] = [];
  for (let i = 0; i + 1 < rest.length; i += 2) facts.push({ label: rest[i], value: rest[i + 1] });
  return { title, facts };
}

export default StudyNotesSheet;
