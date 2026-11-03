import { useRef } from 'react';

/**
 * Hold to do something else than a tap (like WhatsApp's long-press on a chat).
 * Spread the handlers on the element; a tap still runs its onClick, a hold
 * (0.5 s without moving) runs `onLong` and swallows the click that follows.
 */
export function useLongPress(onLong: () => void, ms = 500) {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const cancel = () => {
    clearTimeout(timer.current);
    start.current = null;
  };
  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      fired.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        fired.current = true;
        start.current = null;
        try {
          navigator.vibrate?.(15);
        } catch {
          /* no vibration */
        }
        onLong();
      }, ms);
    },
    onPointerMove: (e: React.PointerEvent) => {
      // Scrolling the list, not holding
      if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) cancel();
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onClickCapture: (e: React.MouseEvent) => {
      if (fired.current) {
        e.preventDefault();
        e.stopPropagation();
        fired.current = false;
      }
    },
    style: { WebkitTouchCallout: 'none' } as React.CSSProperties,
  };
}
