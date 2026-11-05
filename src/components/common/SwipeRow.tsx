import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SwipeAction {
  label: string;
  icon: LucideIcon;
  /** Background colour class */
  className: string;
  onClick: () => void;
}

const BUTTON = 76;
/** A swipe past this share of the row does the main action straight away (like WhatsApp) */
const FULL = 0.55;

/**
 * A list row that slides sideways to show actions, like WhatsApp's chat list:
 * swipe right for `left` (e.g. Unread · Pin), left for `right` (e.g. More ·
 * Archive). A long swipe does the main one (`left[0]` / the last of `right`).
 * Vertical scrolling is left to the page; taps and holds go to the row itself.
 */
const SwipeRow = ({
  left = [], right = [], open, onOpenChange, disabled, children, className,
}: {
  left?: SwipeAction[];
  right?: SwipeAction[];
  /** Which side is showing its actions ('left' = swiped right) */
  open: 'left' | 'right' | null;
  onOpenChange: (open: 'left' | 'right' | null) => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const slideRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; base: number; dx: number; active: boolean; dead: boolean; t: number } | null>(null);
  const justSwiped = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState(0);

  const leftWidth = left.length * BUTTON;
  const rightWidth = right.length * BUTTON;
  const resting = open === 'left' ? leftWidth : open === 'right' ? -rightWidth : 0;

  useEffect(() => {
    if (!dragging) setOffset(resting);
  }, [resting, dragging]);

  // Open: a touch anywhere else closes it
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (!rowRef.current?.contains(e.target as Node)) onOpenChange(null);
    };
    document.addEventListener('pointerdown', close, true);
    return () => document.removeEventListener('pointerdown', close, true);
  }, [open, onOpenChange]);

  const width = () => rowRef.current?.offsetWidth || 360;

  const onTouchStart = (e: React.TouchEvent) => {
    if (disabled || e.touches.length !== 1) return;
    const t = e.touches[0];
    drag.current = { x: t.clientX, y: t.clientY, base: resting, dx: resting, active: false, dead: false, t: Date.now() };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const d = drag.current;
    if (!d || d.dead) return;
    const t = e.touches[0];
    const mx = t.clientX - d.x;
    const my = t.clientY - d.y;
    if (!d.active) {
      if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) {
        d.dead = true; // scrolling the list
        return;
      }
      if (Math.abs(mx) < 10 || Math.abs(mx) < Math.abs(my) * 1.3) return;
      d.active = true;
      setDragging(true);
    }
    let next = d.base + mx;
    // Only towards sides that have actions; past the buttons it gets heavier, up to a full swipe
    if (!leftWidth) next = Math.min(next, 0);
    if (!rightWidth) next = Math.max(next, 0);
    const w = width();
    next = Math.max(-w * 0.9, Math.min(w * 0.9, next));
    d.dx = next;
    if (slideRef.current) slideRef.current.style.transform = `translate3d(${next}px,0,0)`;
    setOffset(next);
  };

  const onTouchEnd = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.active) return;
    justSwiped.current = Date.now();
    setDragging(false);
    const w = width();
    const fast = Date.now() - d.t < 250;
    if (d.dx > w * FULL && left[0]) {
      onOpenChange(null);
      navigator.vibrate?.(12);
      left[0].onClick();
    } else if (d.dx < -w * FULL && right.length) {
      onOpenChange(null);
      navigator.vibrate?.(12);
      right[right.length - 1].onClick();
    } else if (d.dx > Math.min(leftWidth / 2, 50) || (fast && d.dx > 24 && leftWidth)) onOpenChange('left');
    else if (d.dx < -Math.min(rightWidth / 2, 50) || (fast && d.dx < -24 && rightWidth)) onOpenChange('right');
    else onOpenChange(null);
  };

  const shown = dragging ? offset : resting;
  const run = (a: SwipeAction) => {
    onOpenChange(null);
    a.onClick();
  };

  return (
    <div ref={rowRef} className={cn('relative overflow-hidden rounded-2xl', className)}>
      {/* Swiped right: actions on the left */}
      {shown > 0 && (
        <div className="absolute inset-y-0 left-0 flex" style={{ width: Math.max(shown, leftWidth) }}>
          {left.map((a, i) => (
            <button
              key={a.label}
              type="button"
              onClick={() => run(a)}
              className={cn('flex h-full flex-col items-center justify-center gap-1 text-[12.5px] font-medium text-white', a.className)}
              // A long swipe stretches the first (main) action across
              style={{ width: i === 0 ? Math.max(BUTTON, shown - (left.length - 1) * BUTTON) : BUTTON }}
            >
              <a.icon className="h-5 w-5" /> {a.label}
            </button>
          ))}
        </div>
      )}
      {/* Swiped left: actions on the right */}
      {shown < 0 && (
        <div className="absolute inset-y-0 right-0 flex" style={{ width: Math.max(-shown, rightWidth) }}>
          {right.map((a, i) => (
            <button
              key={a.label}
              type="button"
              onClick={() => run(a)}
              className={cn('flex h-full flex-col items-center justify-center gap-1 text-[12.5px] font-medium text-white', a.className)}
              style={{ width: i === right.length - 1 ? Math.max(BUTTON, -shown - (right.length - 1) * BUTTON) : BUTTON }}
            >
              <a.icon className="h-5 w-5" /> {a.label}
            </button>
          ))}
        </div>
      )}
      <div
        ref={slideRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        // A swipe isn't a tap; tapping an open row closes it
        onClickCapture={(e) => {
          if (Date.now() - justSwiped.current < 350 || open) {
            e.preventDefault();
            e.stopPropagation();
            if (open) onOpenChange(null);
          }
        }}
        className={cn('relative touch-pan-y bg-background', !dragging && 'transition-transform duration-200 ease-out')}
        style={{ transform: `translate3d(${shown}px,0,0)` }}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeRow;
