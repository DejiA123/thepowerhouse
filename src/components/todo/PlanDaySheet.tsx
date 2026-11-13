import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Coffee, Sun } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  DAILY_FOCUS_MIN, aboutLabel, dueLabel, durationLabel, isOverdue, localDay, planDay, remainingMinutes, sameDay, timeLabel, todayOrder, worthToday, type DayBlock,
} from '@/lib/todo/brain';
import type { Todo } from '@/lib/todo/types';
import { Chip, SheetTop, sheetClass } from './parts';

const CAPACITY_KEY = 'todo_capacity_v1';
const END_KEY = 'todo_day_end_v1';
const read = (k: string, fallback: string) => {
  try {
    return localStorage.getItem(k) || fallback;
  } catch {
    return fallback;
  }
};
const keep = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private window */
  }
};

/**
 * Plan my day: choose what matters today and say honestly how much time you have. The
 * app shows when that's more than fits (the usual cause of a day that slips), then lays
 * it out as a timeline with breaks. Each start time rings a reminder.
 */
const PlanDaySheet = ({ open, onOpenChange, todos, onApply }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todos: Todo[];
  /** Each block's start becomes the task's start time; unchosen tasks leave Today */
  onApply: (blocks: DayBlock[], unchosen: Todo[]) => void;
}) => {
  const isMobile = useIsMobile();
  const [capacity, setCapacity] = useState(() => Number(read(CAPACITY_KEY, '180')) || 180);
  const [end, setEnd] = useState(() => read(END_KEY, '21:00'));
  const [now, setNow] = useState(() => new Date());
  const [chosen, setChosen] = useState<Set<string>>(new Set());

  const today = useMemo(() => todayOrder(todos, now), [todos, now]);
  const extra = useMemo(() => worthToday(todos, now, 6), [todos, now]);

  // Opening: everything for today ticked
  useEffect(() => {
    if (!open) return;
    const n = new Date();
    setNow(n);
    setChosen(new Set(todayOrder(todos, n).map((t) => t.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const [eh, em] = end.split(':').map(Number);
  const picked = todos.filter((t) => chosen.has(t.id));
  const plan = useMemo(() => planDay(picked, now, { capacityMin: capacity, endHour: eh, endMinute: em }), [picked, now, capacity, eh, em]);
  const want = picked.reduce((n, t) => n + Math.min(remainingMinutes(t), DAILY_FOCUS_MIN), 0);
  const tomorrow = !sameDay(plan.from, now);
  const over = want > capacity;

  const toggle = (id: string) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const row = (t: Todo) => {
    const on = chosen.has(t.id);
    const due = dueLabel(t, now);
    return (
      <button
        key={t.id}
        onClick={() => toggle(t.id)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-muted/50"
        aria-pressed={on}
      >
        <span className={cn('flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border-2', on ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 dark:border-slate-600')}>
          {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium text-foreground">{t.title}</span>
          <span className={cn('block text-[12.5px]', isOverdue(t, now) ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
            ~{aboutLabel(Math.min(remainingMinutes(t), DAILY_FOCUS_MIN))}
            {remainingMinutes(t) > DAILY_FOCUS_MIN ? ' today' : ''}
            {due ? ` · ${due}` : ''}
          </span>
        </span>
      </button>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isMobile ? 'bottom' : 'right'} className={sheetClass} onOpenAutoFocus={(e) => e.preventDefault()} data-testid="plan-day">
        <SheetTop title={tomorrow ? 'Plan tomorrow' : 'Plan your day'} sub="Choose what matters, then make it fit" onClose={() => onOpenChange(false)} />
        <SheetDescription className="sr-only">Pick tasks and how much time you have; the app makes a timeline</SheetDescription>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">
          <p className="text-[13px] font-bold uppercase tracking-[0.06em] text-muted-foreground">Time you really have {tomorrow ? 'tomorrow' : 'today'}</p>
          <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {[60, 120, 180, 240, 360, 480].map((m) => (
              <Chip
                key={m}
                on={capacity === m}
                onClick={() => {
                  setCapacity(m);
                  keep(CAPACITY_KEY, String(m));
                }}
              >
                {durationLabel(m)}
              </Chip>
            ))}
          </div>
          <label className="mt-2 flex items-center justify-between gap-3 text-[14.5px]">
            <span className="text-muted-foreground">Finish by</span>
            <input
              type="time"
              value={end}
              onChange={(e) => {
                if (!e.target.value) return;
                setEnd(e.target.value);
                keep(END_KEY, e.target.value);
              }}
              className="h-10 rounded-xl border border-border bg-background px-3 text-[15px]"
            />
          </label>

          {/* How full it is */}
          <div className="mt-4">
            <div className="flex items-baseline justify-between text-[13.5px]">
              <span className="font-semibold text-foreground">{durationLabel(want)} chosen</span>
              <span className={cn('font-medium', over ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>of {durationLabel(capacity)}</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full transition-all', over ? 'bg-red-500' : want > capacity * 0.85 ? 'bg-amber-500' : 'bg-emerald-500')}
                style={{ width: `${Math.min(100, (want / Math.max(1, capacity)) * 100)}%` }}
              />
            </div>
            {over && (
              <p className="mt-2 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-[13.5px] leading-snug text-red-800 dark:bg-red-950/30 dark:text-red-200" data-testid="plan-over">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                That’s more than you have. Overfull days are why things slip: untick something, or the last {plan.overflow.length === 1 ? 'one' : plan.overflow.length} won’t fit.
              </p>
            )}
          </div>

          <p className="mt-5 text-[13px] font-bold uppercase tracking-[0.06em] text-muted-foreground">{tomorrow ? 'Tomorrow' : 'Today'}</p>
          {today.length ? (
            <div className="mt-2 divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/70">{today.map(row)}</div>
          ) : (
            <p className="mt-2 text-[13.5px] text-muted-foreground">Nothing due or planned yet. Pick from below.</p>
          )}
          {extra.length > 0 && (
            <>
              <p className="mt-5 text-[13px] font-bold uppercase tracking-[0.06em] text-muted-foreground">Worth doing too</p>
              <div className="mt-2 divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/70">{extra.map(row)}</div>
            </>
          )}

          {/* The timeline */}
          {plan.blocks.length > 0 && (
            <>
              <p className="mt-6 text-[13px] font-bold uppercase tracking-[0.06em] text-muted-foreground">Your timeline</p>
              <ol className="mt-2 space-y-1.5" data-testid="plan-timeline">
                {[
                  ...plan.blocks.map((b) => ({ kind: 'task' as const, at: b.start, b })),
                  ...plan.breaks.map((br) => ({ kind: 'break' as const, at: br.start, br })),
                ]
                  .sort((x, y) => x.at.getTime() - y.at.getTime())
                  .map((item) =>
                    item.kind === 'break' ? (
                      <li key={`b-${item.at.getTime()}`} className="flex items-center gap-3 px-1 text-[13px] text-muted-foreground">
                        <span className="w-[52px] shrink-0 text-right tabular-nums">{timeLabel(item.br.start)}</span>
                        <Coffee className="h-4 w-4" /> Break, 15 min
                      </li>
                    ) : (
                      <li key={item.b.todo.id} className="flex items-stretch gap-3">
                        <span className="w-[52px] shrink-0 pt-2 text-right text-[13px] font-semibold tabular-nums text-foreground">{timeLabel(item.b.start)}</span>
                        <span className={cn('min-w-0 flex-1 rounded-xl border-l-4 px-3 py-2', item.b.late ? 'border-red-500 bg-red-50 dark:bg-red-950/30' : 'border-blue-500 bg-blue-50 dark:bg-blue-950/30')}>
                          <span className="block truncate text-[14.5px] font-semibold text-foreground">{item.b.todo.title}</span>
                          <span className="block text-[12.5px] text-muted-foreground">
                            {item.b.minutes} min{item.b.partial ? ' (today’s share)' : ''} · until {timeLabel(item.b.end)}
                            {item.b.late && <span className="font-semibold text-red-600 dark:text-red-400"> · ends after its deadline</span>}
                          </span>
                        </span>
                      </li>
                    ),
                  )}
              </ol>
              {plan.overflow.length > 0 && (
                <p className="mt-3 text-[13px] text-muted-foreground">
                  Won’t fit {tomorrow ? 'tomorrow' : 'today'}: {plan.overflow.map((t) => t.title).join(', ')}. They stay on your list.
                </p>
              )}
            </>
          )}
        </div>

        <div className="border-t border-border/60 px-4 pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+0.75rem)] pt-3">
          <button
            onClick={() => onApply(plan.blocks, today.filter((t) => !chosen.has(t.id) && t.today_on === localDay(now)))}
            disabled={!plan.blocks.length}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-[15.5px] font-semibold text-white shadow-md shadow-blue-600/25 active:scale-[0.99] disabled:opacity-40"
            data-testid="plan-apply"
          >
            <Sun className="h-5 w-5" />
            {plan.blocks.length ? `Set my day · ${plan.blocks.length} ${plan.blocks.length === 1 ? 'task' : 'tasks'}, done by ${timeLabel(plan.blocks[plan.blocks.length - 1].end)}` : 'Tick what you’ll do'}
          </button>
          <p className="mt-2 text-center text-[12.5px] text-muted-foreground">A reminder rings at each start time.</p>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PlanDaySheet;
