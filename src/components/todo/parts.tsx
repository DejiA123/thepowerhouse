import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { localDay } from '@/lib/todo/brain';

/** Bottom sheet on phones, right-hand panel on computers */
export const sheetClass =
  'flex max-h-[92dvh] w-full flex-col gap-0 overflow-hidden rounded-t-3xl p-0 sm:h-full sm:max-w-md sm:rounded-none [&>button]:hidden';

export const SheetTop = ({ title, sub, onClose, action }: { title: ReactNode; sub?: ReactNode; onClose: () => void; action?: ReactNode }) => (
  <div className="flex items-center gap-2 border-b border-border/60 px-4 pb-3 pt-5">
    <div className="min-w-0 flex-1">
      <SheetTitle className="truncate text-[18px] font-bold">{title}</SheetTitle>
      {sub && <p className="truncate text-[13px] text-muted-foreground">{sub}</p>}
    </div>
    {action}
    <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Close">
      <X className="h-5 w-5" />
    </button>
  </div>
);

/** A round choice button ("Tonight", "1 h") */
export const Chip = ({ on, onClick, children, className }: { on?: boolean; onClick: () => void; children: ReactNode; className?: string }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    className={cn(
      'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold transition active:scale-95',
      on ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/25' : 'bg-muted/70 text-foreground hover:bg-muted',
      className,
    )}
  >
    {children}
  </button>
);

export const Section = ({ title, hint, children, className }: { title: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) => (
  <section className={cn('mt-5', className)}>
    <h3 className="mb-2 text-[13px] font-bold uppercase tracking-[0.06em] text-muted-foreground">{title}</h3>
    {children}
    {hint && <p className="mt-2 text-[13px] leading-snug text-muted-foreground">{hint}</p>}
  </section>
);

/** For <input type="datetime-local"> */
export const toLocalInput = (d: Date) =>
  `${localDay(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444'];

/** A short burst of confetti each time `burst` changes (a task done) */
export function Confetti({ burst }: { burst: number }) {
  const [pieces, setPieces] = useState<{ id: string; dx: number; dy: number; r: number; c: string; d: number }[]>([]);
  useEffect(() => {
    if (!burst) return;
    const made = Array.from({ length: 26 }, (_, i) => ({
      id: `${burst}-${i}`,
      dx: Math.round((Math.random() - 0.5) * 340),
      dy: Math.round(-120 - Math.random() * 260),
      r: Math.round((Math.random() - 0.5) * 720),
      c: COLORS[i % COLORS.length],
      d: Math.round(Math.random() * 120),
    }));
    setPieces(made);
    const t = setTimeout(() => setPieces([]), 1500);
    return () => clearTimeout(t);
  }, [burst]);
  if (!pieces.length) return null;
  return createPortal(
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[400] overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="todo-confetti-piece"
          style={{ background: p.c, animationDelay: `${p.d}ms`, ['--dx' as string]: `${p.dx}px`, ['--dy' as string]: `${p.dy}px`, ['--r' as string]: `${p.r}deg` }}
        />
      ))}
    </div>,
    document.body,
  );
}
