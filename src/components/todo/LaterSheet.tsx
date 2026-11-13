import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Clock, Coffee, Moon, Sparkles, Sun, Sunrise, Sunset, Timer } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { daysFrom, deadline, laterTime, pickForMe, timesFor, whenLabel, type Later } from '@/lib/todo/brain';
import type { Todo } from '@/lib/todo/types';
import { cn } from '@/lib/utils';
import { SheetTop, sheetClass, toLocalInput } from './parts';

/**
 * "Not now" never means "never": it means a time. The task is planned for then, and a
 * reminder rings ("Time to start"). It also counts as putting it off, which the coach
 * notices after the second time. Once "Is it working?" knows when your plans really
 * happen (insights.ts `bestLater`), that option says "Works best for you".
 */
const LaterSheet = ({ todo, onClose, onPick, title = 'When will you do it?', best = null }: {
  todo: Todo | null;
  onClose: () => void;
  onPick: (when: Date) => void;
  title?: string;
  /** The option that matches your best time of day */
  best?: Later | null;
}) => {
  const isMobile = useIsMobile();
  // One "now" per opening, so the times don't shift while you choose
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => new Date(), [todo?.id]);
  const due = todo ? deadline(todo) : null;
  const auto = pickForMe(now, due, best);
  const [custom, setCustom] = useState('');
  const days = useMemo(() => daysFrom(now), [now]);
  const [dayIx, setDayIx] = useState(0);
  // A fresh start each time it opens for a task
  useEffect(() => {
    setDayIx(0);
    setCustom('');
  }, [todo?.id]);
  const day = days[Math.min(dayIx, days.length - 1)];
  const times = timesFor(day, now);
  const timeLabel = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const dayLabel = (d: Date, i: number) =>
    i === 0 && d.getDate() === now.getDate() ? 'Today' : d.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() < 2 * 86_400_000 ? 'Tomorrow' : d.toLocaleDateString([], { weekday: 'short' });
  const soon = [
    { label: 'In 15 min', min: 15 },
    { label: 'In 30 min', min: 30 },
    { label: 'In 2 hours', min: 120 },
    { label: 'In 3 hours', min: 180 },
  ];
  const late = (d: Date) => !!due && d.getTime() > due.getTime();
  const options: { kind: Later; label: string; icon: typeof Clock }[] = [
    { kind: 'hour', label: 'In an hour', icon: Coffee },
    // Only when afternoons are when you get going
    ...(best === 'afternoon' ? [{ kind: 'afternoon' as const, label: now.getHours() < 13 ? 'This afternoon' : 'Tomorrow afternoon', icon: Sunset }] : []),
    { kind: 'tonight', label: now.getHours() < 19 ? 'This evening' : 'A bit later', icon: Moon },
    { kind: 'tomorrow', label: 'Tomorrow morning', icon: Sunrise },
    { kind: 'weekend', label: 'At the weekend', icon: Sun },
    { kind: 'nextweek', label: 'Next week', icon: CalendarClock },
  ];
  return (
    <Sheet open={!!todo} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side={isMobile ? 'bottom' : 'right'} className={sheetClass} onOpenAutoFocus={(e) => e.preventDefault()} data-testid="later-sheet">
        <SheetTop title={title} sub={todo?.title} onClose={onClose} />
        <SheetDescription className="px-4 pt-3 text-[14px] leading-snug text-muted-foreground">
          Pick a real time. A plan with a time is far more likely to happen, and you’ll get a reminder then.
          {due && ` It’s due ${whenLabel(due, now, !todo?.due_all_day)}.`}
        </SheetDescription>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+1rem)] pt-2">
          {/* One tap: a sensible time, chosen for you */}
          <button
            onClick={() => onPick(auto)}
            className="mb-1 flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-3 text-left text-white shadow-sm active:scale-[0.99]"
            data-testid="later-auto"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-semibold">Pick a time for me</span>
              <span className="block text-[13px] text-white/85"><span className="capitalize">{whenLabel(auto, now)}</span>{late(auto) && ' · after the deadline'}</span>
            </span>
          </button>
          {options.map((o) => {
            const at = laterTime(o.kind, now);
            // "This evening" late at night is just "a bit later": not the evening that works
            const isBest = best === o.kind && !(o.kind === 'tonight' && now.getHours() >= 19);
            return (
              <button
                key={o.kind}
                onClick={() => onPick(at)}
                className={cn('flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-muted active:bg-muted', isBest && 'bg-emerald-50 dark:bg-emerald-950/30')}
                data-testid={`later-${o.kind}`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
                  <o.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[16px] font-semibold text-foreground">
                    {o.label}
                    {isBest && (
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11.5px] font-bold text-white" data-testid="later-best">
                        Works best for you
                      </span>
                    )}
                  </span>
                  <span className="block text-[13px] text-muted-foreground">
                    <span className="capitalize">{whenLabel(at, now)}</span>
                    {late(at) && <span className="font-semibold text-red-600 dark:text-red-400"> · after the deadline</span>}
                  </span>
                </span>
              </button>
            );
          })}
          {/* Soon: a few taps from now */}
          <div className="mt-2 flex gap-2 overflow-x-auto px-1 pb-1" data-testid="later-soon">
            {soon.map((o) => (
              <button
                key={o.min}
                onClick={() => onPick(new Date(Math.ceil((now.getTime() + o.min * 60_000) / (5 * 60_000)) * 5 * 60_000))}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-3.5 py-2 text-[14px] font-medium text-foreground active:scale-95"
              >
                <Timer className="h-4 w-4 text-muted-foreground" /> {o.label}
              </button>
            ))}
          </div>

          {/* Choose a day, then tap a time: no typing */}
          <div className="mt-3 rounded-2xl border border-border/70 p-3" data-testid="later-picker">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Choose a day and time</p>
            <div className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Day">
              {days.map((d, i) => (
                <button
                  key={d.toDateString()}
                  role="tab"
                  aria-selected={i === dayIx}
                  onClick={() => setDayIx(i)}
                  className={cn(
                    'flex w-[58px] shrink-0 flex-col items-center rounded-xl py-1.5 transition',
                    i === dayIx ? 'bg-blue-600 text-white' : 'bg-muted text-foreground',
                  )}
                >
                  <span className="text-[12px] font-medium">{dayLabel(d, i)}</span>
                  <span className="text-[17px] font-bold leading-tight">{d.getDate()}</span>
                </button>
              ))}
            </div>
            <div className="mt-2.5 grid grid-cols-4 gap-1.5" data-testid="later-times">
              {times.map((t) => (
                <button
                  key={t.getTime()}
                  onClick={() => onPick(t)}
                  className={cn(
                    'rounded-xl py-2.5 text-[14.5px] font-semibold tabular-nums active:scale-95',
                    late(t) ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300' : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200',
                  )}
                >
                  {timeLabel(t)}
                </button>
              ))}
            </div>
            {due && times.some(late) && <p className="mt-1.5 text-[12px] text-red-600 dark:text-red-400">Red times are after the deadline.</p>}
          </div>

          <p className="mt-3 px-3 text-[13px] text-muted-foreground">Or an exact date and time</p>
          <div className="flex items-center gap-2 rounded-2xl px-3 pb-2.5 pt-1.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Clock className="h-5 w-5" />
            </span>
            <input
              type="datetime-local"
              value={custom || toLocalInput(auto)}
              min={toLocalInput(now)}
              onChange={(e) => setCustom(e.target.value)}
              aria-label="Pick a time"
              className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-[15px]"
            />
            <button
              onClick={() => onPick(new Date(custom || toLocalInput(auto)))}
              className="h-11 shrink-0 rounded-xl bg-blue-600 px-4 text-[15px] font-semibold text-white disabled:opacity-40"
            >
              Set
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default LaterSheet;
