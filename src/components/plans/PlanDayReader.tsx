import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Check, Flame, Headphones, Loader2, Pause, RotateCcw, Trophy, X } from 'lucide-react';
import { useGlobalAudio } from '@/contexts/GlobalAudioContext';
import { cn } from '@/lib/utils';
import { normalizeBookApiName } from '@/components/bible/bookUtils';
import { getChapterVerses } from '@/components/bible/verseText';
import { expandReading, type Passage, type ReadingPlan } from '@/services/readingPlanService';

type Step = { kind: 'devotional' } | { kind: 'passage'; passage: Passage };

interface PlanDayReaderProps {
  plan: ReadingPlan;
  day: number;
  version: string;
  isDone: boolean;
  streak: number;
  /** Marks the day read; resolves with whether that finished the plan */
  onComplete: (day: number) => Promise<{ finishedPlan: boolean }>;
  onOpenDay: (day: number) => void;
  onClose: () => void;
}

const readerFontSize = () => {
  try {
    return Math.max(15, Number(localStorage.getItem('bible-font-size')) || 17);
  } catch {
    return 17;
  }
};

/** A day of a plan, one page at a time: devotional, then each passage, then a finish screen. */
const PlanDayReader = ({ plan, day, version, isDone, streak, onComplete, onOpenDay, onClose }: PlanDayReaderProps) => {
  const reading = plan.dailyReadings.find((r) => r.day === day);
  const steps = useMemo<Step[]>(() => {
    const list: Step[] = [];
    if (reading?.teachingText) list.push({ kind: 'devotional' });
    (reading?.readings || []).forEach((ref) => expandReading(ref).forEach((passage) => list.push({ kind: 'passage', passage })));
    return list;
  }, [reading]);

  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState<{ finishedPlan: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fontSize = useMemo(readerFontSize, []);

  useEffect(() => {
    setIndex(0);
    setFinished(null);
  }, [plan.id, day]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [index, finished]);

  // Full-screen: hold the page still underneath and support the keyboard
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(steps.length - 1, i + 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, steps.length]);

  const complete = async () => {
    setSaving(true);
    try {
      const result = await onComplete(day);
      setFinished(result);
      if (result.finishedPlan) {
        import('canvas-confetti').then(({ default: confetti }) => {
          confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, zIndex: 10000 });
          setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { y: 0.4 }, zIndex: 10000 }), 350);
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const step = steps[index];
  const last = index === steps.length - 1;
  const hasNextDay = day < plan.totalDays;

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex flex-col bg-background animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Top bar */}
      <div className="shrink-0 border-b border-border/60 bg-background/95 px-3 pb-2.5 pt-[calc(0.6rem+env(safe-area-inset-top,0px))] backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <button onClick={onClose} className="rounded-full p-2 text-foreground hover:bg-muted" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Day {day} of {plan.totalDays}
            </p>
            <p className="truncate text-[15px] font-semibold text-foreground">{plan.name}</p>
          </div>
          <span className="w-9 text-right text-xs font-semibold text-muted-foreground">
            {!finished && steps.length > 1 ? `${index + 1}/${steps.length}` : ''}
          </span>
        </div>
        {!finished && steps.length > 1 && (
          <div className="mx-auto mt-2 flex max-w-2xl gap-1 px-1">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={cn('h-1 flex-1 rounded-full transition-colors', i <= index ? 'bg-blue-600 dark:bg-blue-400' : 'bg-slate-200 dark:bg-slate-700')}
                aria-label={`Part ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Page */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-5 pb-10 pt-6">
          {finished ? (
            <FinishView
              plan={plan}
              day={day}
              streak={streak}
              finishedPlan={finished.finishedPlan}
              hasNextDay={hasNextDay}
              onNext={() => onOpenDay(day + 1)}
              onClose={onClose}
            />
          ) : !step ? (
            <p className="py-16 text-center text-muted-foreground">Nothing to read for this day.</p>
          ) : step.kind === 'devotional' ? (
            <article className="animate-in fade-in slide-in-from-right-4 duration-300">
              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                Devotional
              </span>
              <h1 className="mt-3 font-outfit text-[30px] font-extrabold leading-tight tracking-tight text-foreground">{reading?.teachingTitle}</h1>
              <div className="mt-5 space-y-5 font-serif leading-[1.8] text-foreground/90" style={{ fontSize }}>
                {reading?.teachingText?.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
              </div>
              {reading?.reflectionQuestion && (
                <div className="mt-8 rounded-2xl border border-amber-200/70 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/30">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">Reflect</p>
                  <p className="mt-2 font-serif text-[17px] italic leading-relaxed text-foreground">{reading.reflectionQuestion}</p>
                </div>
              )}
              <p className="mt-8 text-sm text-muted-foreground">Today’s reading: {reading?.readings.join(' · ')}</p>
            </article>
          ) : (
            <PassageView key={`${step.passage.book}-${step.passage.chapter}-${step.passage.verseStart ?? ''}`} passage={step.passage} version={version} fontSize={fontSize} onClose={onClose} />
          )}
        </div>
      </div>

      {/* Bottom bar */}
      {!finished && steps.length > 0 && (
        <div className="shrink-0 border-t border-border/60 bg-background/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <button
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground transition active:scale-95 disabled:opacity-30"
              aria-label="Previous"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            {!last ? (
              <button
                onClick={() => setIndex((i) => i + 1)}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 font-bold text-white shadow-lg shadow-blue-600/25 transition active:scale-[0.98]"
              >
                Next <ArrowRight className="h-5 w-5" />
              </button>
            ) : isDone ? (
              <button
                onClick={() => (hasNextDay ? onOpenDay(day + 1) : onClose())}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-50 font-bold text-emerald-700 transition active:scale-[0.98] dark:bg-emerald-950/50 dark:text-emerald-300"
              >
                <Check className="h-5 w-5" /> Completed{hasNextDay ? ' · next day' : ''}
              </button>
            ) : (
              <button
                onClick={complete}
                disabled={saving}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 font-bold text-white shadow-lg shadow-emerald-600/25 transition active:scale-[0.98] disabled:opacity-70"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} Complete day {day}
              </button>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
};

const PassageView = ({ passage, version, fontSize, onClose }: { passage: Passage; version: string; fontSize: number; onClose: () => void }) => {
  const navigate = useNavigate();
  const audio = useGlobalAudio();
  const [verses, setVerses] = useState<[number, string][] | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setVerses(null);
    getChapterVerses(version, passage.book, passage.chapter).then((map) => {
      if (cancelled) return;
      const list = [...map.entries()]
        .filter(([n]) => (!passage.verseStart || n >= passage.verseStart) && (!passage.verseEnd || n <= passage.verseEnd))
        .sort((a, b) => a[0] - b[0]);
      setVerses(list);
    });
    return () => {
      cancelled = true;
    };
  }, [passage, version, attempt]);

  const a = audio?.audioState;
  const playingHere =
    !!a?.hasAudio && normalizeBookApiName(a.currentBook || '') === passage.book && a.currentChapter === passage.chapter;
  const listen = () => {
    if (!audio) return;
    if (playingHere && a?.isPlaying) audio.pause();
    else if (playingHere && a?.isPaused) audio.resume();
    else audio.playBibleChapterMP3(passage.book, passage.chapter, version, false, false).catch(() => undefined);
  };

  return (
    <article className="animate-in fade-in slide-in-from-right-4 duration-300">
      <h1 className="font-outfit text-[30px] font-extrabold leading-tight tracking-tight text-foreground">{passage.label}</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={listen}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-1.5 text-[13px] font-semibold text-white transition active:scale-95 dark:bg-white dark:text-slate-900"
        >
          {playingHere && a?.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : playingHere && a?.isPlaying ? (
            <Pause className="h-4 w-4 fill-current" />
          ) : (
            <Headphones className="h-4 w-4" />
          )}
          {playingHere && a?.isPlaying ? 'Pause' : 'Listen'}
        </button>
        <button
          onClick={() => {
            onClose();
            navigate(`/bible?book=${passage.book}&chapter=${passage.chapter}`);
          }}
          className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3.5 py-1.5 text-[13px] font-semibold text-foreground transition active:scale-95"
        >
          <BookOpen className="h-4 w-4" /> Open in Bible
        </button>
      </div>

      {verses === null ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-muted" style={{ width: `${70 + ((i * 37) % 30)}%` }} />
          ))}
        </div>
      ) : verses.length === 0 ? (
        <div className="mt-10 flex flex-col items-center text-center">
          <p className="font-semibold text-foreground">Couldn’t load {passage.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">Check your connection and try again.</p>
          <button
            onClick={() => setAttempt((n) => n + 1)}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background"
          >
            <RotateCcw className="h-4 w-4" /> Try again
          </button>
        </div>
      ) : (
        <div className="mt-6 font-serif leading-[1.8] text-foreground" style={{ fontSize }}>
          {verses.map(([n, text]) => (
            <p key={n} className="mb-3">
              <sup className="mr-1.5 font-sans text-[0.62em] font-semibold text-blue-600/80 dark:text-blue-400/80">{n}</sup>
              {text}
            </p>
          ))}
        </div>
      )}
    </article>
  );
};

const FinishView = ({
  plan,
  day,
  streak,
  finishedPlan,
  hasNextDay,
  onNext,
  onClose,
}: {
  plan: ReadingPlan;
  day: number;
  streak: number;
  finishedPlan: boolean;
  hasNextDay: boolean;
  onNext: () => void;
  onClose: () => void;
}) => {
  const next = plan.dailyReadings.find((r) => r.day === day + 1);
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-500">
      <span
        className={cn(
          'flex h-24 w-24 items-center justify-center rounded-full text-white shadow-xl',
          finishedPlan ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/30' : 'bg-emerald-500 shadow-emerald-500/30',
        )}
      >
        {finishedPlan ? <Trophy className="h-11 w-11" /> : <Check className="h-12 w-12" strokeWidth={3} />}
      </span>
      <h2 className="mt-6 font-outfit text-[30px] font-extrabold tracking-tight text-foreground">
        {finishedPlan ? 'Plan complete!' : `Day ${day} done`}
      </h2>
      <p className="mt-2 max-w-sm text-[15px] text-muted-foreground">
        {finishedPlan ? plan.reward : 'Well done. Let what you read stay with you today.'}
      </p>
      {streak > 0 && (
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3.5 py-1.5 text-sm font-semibold text-orange-600 dark:bg-orange-950/40 dark:text-orange-300">
          <Flame className="h-4 w-4" /> {streak}-day streak
        </p>
      )}
      <div className="mt-8 w-full max-w-sm space-y-3">
        {!finishedPlan && hasNextDay && next && (
          <button
            onClick={onNext}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-muted font-semibold text-foreground transition active:scale-[0.98]"
          >
            Read ahead: day {day + 1} <ArrowRight className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={onClose}
          className="h-12 w-full rounded-2xl bg-blue-600 font-bold text-white shadow-lg shadow-blue-600/25 transition active:scale-[0.98]"
        >
          Done
        </button>
      </div>
    </div>
  );
};

export default PlanDayReader;
