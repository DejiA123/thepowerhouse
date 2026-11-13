import { Sheet, SheetContent, SheetDescription } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { addDays, dueLabel, laterTime, moveDue } from '@/lib/todo/brain';
import type { Todo } from '@/lib/todo/types';
import { SheetTop, sheetClass } from './parts';

/**
 * A fresh start: a pile of overdue tasks makes people avoid the whole list. One tap each
 * gives it an honest new day, sends it to Someday, or marks it done if it already is.
 */
const FreshStartSheet = ({ open, onOpenChange, overdue, onChange, onDone }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  overdue: Todo[];
  onChange: (id: string, patch: Partial<Todo>) => void;
  onDone: (t: Todo) => void;
}) => {
  const isMobile = useIsMobile();
  const now = new Date();
  const options: { label: string; patch: (t: Todo) => Partial<Todo> }[] = [
    { label: 'Today', patch: (t) => ({ ...moveDue(t, now, now), today_on: null }) },
    { label: 'Tomorrow', patch: (t) => moveDue(t, addDays(now, 1), now) },
    { label: 'Next week', patch: (t) => moveDue(t, laterTime('nextweek', now), now) },
    { label: 'Someday', patch: () => ({ due_at: null, due_all_day: false, plan_at: null, today_on: null }) },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isMobile ? 'bottom' : 'right'} className={sheetClass} onOpenAutoFocus={(e) => e.preventDefault()} data-testid="fresh-start">
        <SheetTop title="A fresh start" sub={`${overdue.length} overdue`} onClose={() => onOpenChange(false)} />
        <SheetDescription className="px-4 pt-3 text-[14px] leading-snug text-muted-foreground">
          No guilt: give each one an honest new day, or let it wait for someday. A short, true list is easier to start.
        </SheetDescription>
        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+1rem)] pt-3">
          {overdue.length === 0 && <p className="py-8 text-center text-[15px] text-muted-foreground">All sorted. Nothing overdue. 🙌</p>}
          {overdue.map((t) => (
            <div key={t.id} className="rounded-2xl border border-border/70 p-3" data-testid="fresh-start-item">
              <p className="text-[15.5px] font-semibold text-foreground [overflow-wrap:anywhere]">{t.title}</p>
              <p className="text-[12.5px] text-red-600 dark:text-red-400">{dueLabel(t, now)}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {options.map((o) => (
                  <button
                    key={o.label}
                    onClick={() => onChange(t.id, o.patch(t))}
                    className="h-9 rounded-full bg-muted px-3 text-[13.5px] font-semibold text-foreground transition active:scale-95"
                  >
                    {o.label}
                  </button>
                ))}
                <button onClick={() => onDone(t)} className="h-9 rounded-full bg-emerald-50 px-3 text-[13.5px] font-semibold text-emerald-700 transition active:scale-95 dark:bg-emerald-950/40 dark:text-emerald-300">
                  Already done
                </button>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FreshStartSheet;
