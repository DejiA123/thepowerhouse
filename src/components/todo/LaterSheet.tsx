import { useState } from 'react';
import { CalendarClock, Clock, Coffee, Moon, Sun, Sunrise } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { deadline, laterTime, whenLabel, type Later } from '@/lib/todo/brain';
import type { Todo } from '@/lib/todo/types';
import { SheetTop, sheetClass, toLocalInput } from './parts';

/**
 * "Not now" never means "never": it means a time. The task is planned for then, and a
 * reminder rings ("Time to start"). It also counts as putting it off, which the coach
 * notices after the second time.
 */
const LaterSheet = ({ todo, onClose, onPick, title = 'When will you do it?' }: {
  todo: Todo | null;
  onClose: () => void;
  onPick: (when: Date) => void;
  title?: string;
}) => {
  const isMobile = useIsMobile();
  const now = new Date();
  const [custom, setCustom] = useState('');
  const due = todo ? deadline(todo) : null;
  const late = (d: Date) => !!due && d.getTime() > due.getTime();
  const options: { kind: Later; label: string; icon: typeof Clock }[] = [
    { kind: 'hour', label: 'In an hour', icon: Coffee },
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
          {options.map((o) => {
            const at = laterTime(o.kind, now);
            return (
              <button
                key={o.kind}
                onClick={() => onPick(at)}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-muted active:bg-muted"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
                  <o.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold text-foreground">{o.label}</span>
                  <span className="block text-[13px] text-muted-foreground">
                    <span className="capitalize">{whenLabel(at, now)}</span>
                    {late(at) && <span className="font-semibold text-red-600 dark:text-red-400"> · after the deadline</span>}
                  </span>
                </span>
              </button>
            );
          })}
          <div className="mt-1 flex items-center gap-2 rounded-2xl px-3 py-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Clock className="h-5 w-5" />
            </span>
            <input
              type="datetime-local"
              value={custom}
              min={toLocalInput(now)}
              onChange={(e) => setCustom(e.target.value)}
              aria-label="Pick a time"
              className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-[15px]"
            />
            <button
              onClick={() => custom && onPick(new Date(custom))}
              disabled={!custom}
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
