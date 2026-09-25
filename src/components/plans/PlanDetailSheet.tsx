import { useMemo, useState } from 'react';
import { BookOpen, CalendarDays, Check, Clock, MoreHorizontal, Play, RotateCcw, Square, Trophy } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import type { ReadingPlan } from '@/services/readingPlanService';
import { completedCount, daysBehind, isFinished, nextDay, type PlanProgress } from '@/services/readingPlanProgressService';
import { PlanCover } from './planArt';

interface PlanDetailSheetProps {
  plan: ReadingPlan | null;
  progress?: PlanProgress;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (plan: ReadingPlan) => void;
  onOpenDay: (plan: ReadingPlan, day: number) => void;
  onRestart: (plan: ReadingPlan) => void;
  onStop: (plan: ReadingPlan) => void;
}

const finishBy = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days - 1);
  return d.toLocaleDateString([], { day: 'numeric', month: 'long', ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });
};

export const scheduleLabel = (p: PlanProgress, totalDays: number) => {
  const behind = daysBehind(p, totalDays);
  if (behind > 0) return { text: `${behind} ${behind === 1 ? 'day' : 'days'} behind`, tone: 'amber' as const };
  if (behind < 0) return { text: `${-behind} ${behind === -1 ? 'day' : 'days'} ahead`, tone: 'blue' as const };
  return { text: 'On track', tone: 'green' as const };
};

const toneClass = {
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
};

/** Everything about one plan: what it is, progress, and every day's readings. */
const PlanDetailSheet = ({ plan, progress, open, onOpenChange, onStart, onOpenDay, onRestart, onStop }: PlanDetailSheetProps) => {
  const isMobile = useIsMobile();
  const [showAll, setShowAll] = useState(false);

  const days = useMemo(() => plan?.dailyReadings ?? [], [plan]);
  if (!plan) return null;

  const enrolled = !!progress;
  const done = progress ? completedCount(progress) : 0;
  const finished = progress ? isFinished(progress, plan.totalDays) : false;
  const next = progress ? nextDay(progress, plan.totalDays) : 1;
  const pct = Math.round((100 * done) / plan.totalDays);
  const schedule = progress && !finished ? scheduleLabel(progress, plan.totalDays) : null;

  // Long plans: show the days around where they are, with the full list a tap away
  const windowStart = Math.max(0, next - 3);
  const visibleDays = showAll || days.length <= 14 ? days : days.slice(windowStart, windowStart + 10);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className="flex h-[94dvh] w-full flex-col gap-0 overflow-hidden rounded-t-[28px] border-0 p-0 sm:h-full sm:max-w-lg sm:rounded-none [&>button]:right-4 [&>button]:top-4 [&>button]:rounded-full [&>button]:bg-black/25 [&>button]:p-1.5 [&>button]:text-white [&>button]:opacity-100"
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <PlanCover plan={plan} className="px-5 pb-6 pt-10" iconClassName="right-auto left-5 top-6 h-9 w-9">
            <div className="pt-8">
              <SheetTitle className="font-outfit text-[30px] font-extrabold leading-tight tracking-tight text-white">{plan.name}</SheetTitle>
              <SheetDescription className="mt-1 text-[15px] text-white/85">{plan.description}</SheetDescription>
              <div className="mt-4 flex flex-wrap gap-2 text-[13px] font-semibold">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 backdrop-blur">
                  <CalendarDays className="h-3.5 w-3.5" /> {plan.totalDays} days
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 backdrop-blur">
                  <Clock className="h-3.5 w-3.5" /> ~{plan.minutesPerDay} min a day
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 backdrop-blur">
                  <BookOpen className="h-3.5 w-3.5" /> {plan.totalChapters} {plan.countNoun ?? 'chapters'}
                </span>
              </div>
            </div>
          </PlanCover>

          <div className="px-5 pb-10 pt-5">
            {/* Progress / start */}
            {enrolled && progress ? (
              <div className="rounded-[20px] border border-slate-200/70 bg-card p-4 shadow-sm dark:border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-bold text-foreground">
                      {finished ? 'Completed' : `Day ${next} of ${plan.totalDays}`}
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                      {done} of {plan.totalDays} days read · {pct}%
                    </p>
                  </div>
                  {schedule && <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', toneClass[schedule.tone])}>{schedule.text}</span>}
                  {finished && <Trophy className="h-6 w-6 text-amber-500" />}
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-blue-600 transition-[width] duration-700 dark:bg-blue-400" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-4 flex gap-2">
                  {!finished ? (
                    <button
                      onClick={() => onOpenDay(plan, next)}
                      className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 font-bold text-white shadow-lg shadow-blue-600/25 transition active:scale-[0.98]"
                    >
                      <Play className="h-4 w-4 fill-current" /> Read day {next}
                    </button>
                  ) : (
                    <button
                      onClick={() => onRestart(plan)}
                      className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 font-bold text-white shadow-lg shadow-blue-600/25 transition active:scale-[0.98]"
                    >
                      <RotateCcw className="h-4 w-4" /> Read it again
                    </button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-foreground" aria-label="Plan options">
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 rounded-xl">
                      <DropdownMenuItem onSelect={() => onRestart(plan)}>
                        <RotateCcw className="mr-2 h-4 w-4" /> Start over from day 1
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => onStop(plan)} className="text-red-600 focus:text-red-600 dark:text-red-400">
                        <Square className="mr-2 h-4 w-4" /> Stop this plan
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ) : (
              <div>
                <button
                  onClick={() => onStart(plan)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-[17px] font-bold text-white shadow-lg shadow-blue-600/25 transition active:scale-[0.98]"
                >
                  Start this plan
                </button>
                <p className="mt-2 text-center text-[13px] text-muted-foreground">
                  Start today and finish by {finishBy(plan.totalDays)}
                </p>
              </div>
            )}

            {/* About */}
            <h3 className="mb-1.5 mt-7 text-[12.5px] font-bold uppercase tracking-[0.07em] text-muted-foreground">About this plan</h3>
            <p className="text-[15.5px] leading-relaxed text-foreground/90">{plan.intro}</p>

            {/* Days */}
            <div className="mb-2 mt-7 flex items-baseline justify-between">
              <h3 className="text-[12.5px] font-bold uppercase tracking-[0.07em] text-muted-foreground">Days</h3>
              {days.length > 14 && (
                <button onClick={() => setShowAll((s) => !s)} className="text-[13.5px] font-semibold text-blue-600 dark:text-blue-400">
                  {showAll ? 'Show fewer' : `See all ${days.length}`}
                </button>
              )}
            </div>
            <div className="divide-y divide-slate-100 overflow-hidden rounded-[20px] border border-slate-200/70 bg-card dark:divide-slate-800 dark:border-slate-800">
              {visibleDays.map((d) => {
                const isRead = progress?.completed[d.day] !== undefined;
                const isNext = enrolled && !finished && d.day === next;
                return (
                  <button
                    key={d.day}
                    onClick={() => onOpenDay(plan, d.day)}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-800/60',
                      isNext && 'bg-blue-50/60 dark:bg-blue-950/30',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold',
                        isRead
                          ? 'bg-emerald-500 text-white'
                          : isNext
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                      )}
                    >
                      {isRead ? <Check className="h-4 w-4" strokeWidth={3} /> : d.day}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-semibold text-foreground">
                        {d.teachingTitle ? d.teachingTitle : d.readings.join(' · ')}
                      </span>
                      <span className="block truncate text-[12.5px] text-muted-foreground">
                        Day {d.day}
                        {d.teachingTitle ? ` · ${d.readings.join(' · ')}` : ''}
                        {isNext ? ' · Up next' : ''}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PlanDetailSheet;
