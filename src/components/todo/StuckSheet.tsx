import { useEffect, useState } from 'react';
import { BatteryLow, Footprints, Frown, Mountain, Sparkles, Trash2, Wind } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { nextStep } from '@/lib/todo/brain';
import type { Todo } from '@/lib/todo/types';
import { SheetTop, sheetClass } from './parts';

/**
 * Procrastination is usually a feeling, not laziness: the task feels too big, unclear,
 * boring, risky, or you're drained. Naming the feeling points to what helps, so each
 * answer leads straight to a way in:
 *   too big          → break it into tiny steps (the helper)
 *   don't know where → write the very first physical action, then 2 minutes on it
 *   boring           → a 10-minute game against the clock
 *   afraid it's bad  → a rough version on purpose (15 minutes, "messy is allowed")
 *   tired / no time  → pick a real time for it (a reminder rings)
 *   don't need to    → let it go (Someday, or delete): that's a decision too
 */
export type StuckAction =
  | { kind: 'breakdown' }
  | { kind: 'first-step'; text: string }
  | { kind: 'focus'; minutes: number; note: string }
  | { kind: 'later' }
  | { kind: 'someday' }
  | { kind: 'delete' };

const StuckSheet = ({ todo, onClose, onAction }: { todo: Todo | null; onClose: () => void; onAction: (a: StuckAction) => void }) => {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<'pick' | 'first' | 'drop'>('pick');
  const [first, setFirst] = useState('');
  useEffect(() => {
    if (todo) {
      setMode('pick');
      setFirst(nextStep(todo)?.text ?? '');
    }
  }, [todo]);

  const put = todo?.snoozes ?? 0;
  const reasons = [
    { id: 'big', icon: Mountain, title: 'It feels too big', detail: 'Break it into tiny steps', go: () => onAction({ kind: 'breakdown' }) },
    { id: 'where', icon: Footprints, title: 'I don’t know where to start', detail: 'Decide the very first move', go: () => setMode('first') },
    { id: 'boring', icon: Wind, title: 'It’s boring', detail: 'Make it a 10-minute game', go: () => onAction({ kind: 'focus', minutes: 10, note: 'Beat the clock: as much as you can in 10 minutes, then you may stop.' }) },
    { id: 'perfect', icon: Frown, title: 'I’m afraid it won’t be good enough', detail: 'Do a rough version on purpose', go: () => onAction({ kind: 'focus', minutes: 15, note: 'Rough version only. Messy is allowed: you can make it good later.' }) },
    { id: 'tired', icon: BatteryLow, title: 'I’m tired or there’s no time now', detail: 'Pick a real time for it', go: () => onAction({ kind: 'later' }) },
    { id: 'drop', icon: Trash2, title: 'I don’t actually need to do it', detail: 'Let it go', go: () => setMode('drop') },
  ];

  return (
    <Sheet open={!!todo} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side={isMobile ? 'bottom' : 'right'} className={sheetClass} onOpenAutoFocus={(e) => e.preventDefault()} data-testid="stuck-sheet">
        <SheetTop title={put >= 2 ? `Put off ${put} times. What’s in the way?` : 'What’s stopping you?'} sub={todo?.title} onClose={onClose} />
        <SheetDescription className="px-4 pt-3 text-[14px] leading-snug text-muted-foreground">
          Putting things off is usually a feeling, not laziness. Name it, and it gets smaller.
        </SheetDescription>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+1rem)] pt-2">
          {mode === 'pick' &&
            reasons.map((r) => (
              <button
                key={r.id}
                onClick={r.go}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-muted active:bg-muted"
                data-testid={`stuck-${r.id}`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300">
                  <r.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15.5px] font-semibold text-foreground">{r.title}</span>
                  <span className="block text-[13px] text-muted-foreground">{r.detail}</span>
                </span>
              </button>
            ))}

          {mode === 'first' && (
            <div className="px-1 pt-2">
              <p className="text-[15px] font-semibold text-foreground">What’s the very first thing you’d physically do?</p>
              <p className="mt-1 text-[13.5px] text-muted-foreground">Something that takes 2 minutes: “open the laptop and find the file”, “take the form out of the drawer”.</p>
              <textarea
                value={first}
                onChange={(e) => setFirst(e.target.value)}
                rows={2}
                autoFocus
                maxLength={120}
                className="mt-3 w-full resize-none rounded-2xl border border-border bg-background px-3.5 py-3 text-[16px] focus:shadow-none"
                placeholder="My first move is…"
              />
              <button
                onClick={() => first.trim() && onAction({ kind: 'first-step', text: first.trim() })}
                disabled={!first.trim()}
                className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-[15.5px] font-semibold text-white disabled:opacity-40"
              >
                <Sparkles className="h-5 w-5" /> Do just that, 2 minutes
              </button>
              <button onClick={() => setMode('pick')} className="mt-2 h-11 w-full rounded-2xl text-[14.5px] font-semibold text-muted-foreground hover:bg-muted">Back</button>
            </div>
          )}

          {mode === 'drop' && (
            <div className="px-1 pt-2">
              <p className="text-[15px] font-semibold text-foreground">Deciding not to do something is a decision too.</p>
              <p className="mt-1 text-[13.5px] text-muted-foreground">Keep it for someday with no dates (no more reminders), or delete it for good.</p>
              <button onClick={() => onAction({ kind: 'someday' })} className="mt-3 h-12 w-full rounded-2xl bg-muted text-[15.5px] font-semibold text-foreground">
                Keep it for someday
              </button>
              <button onClick={() => onAction({ kind: 'delete' })} className="mt-2 h-12 w-full rounded-2xl bg-red-50 text-[15.5px] font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400">
                Delete it
              </button>
              <button onClick={() => setMode('pick')} className="mt-2 h-11 w-full rounded-2xl text-[14.5px] font-semibold text-muted-foreground hover:bg-muted">Back</button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default StuckSheet;
