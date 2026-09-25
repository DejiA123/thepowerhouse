import { useEffect, useRef, useState } from 'react';

/** Touches that start on these keep their own gestures (typing, sliders, drag-to-reorder…) */
const SKIP = 'input, textarea, select, [contenteditable="true"], [role="slider"], canvas, [data-no-swipe], [aria-roledescription="sortable"]';

const isTouchDevice = () =>
  typeof window !== 'undefined' && ('ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0);

/**
 * Pull a sheet or modal down to close it, like on iOS. The drag only begins
 * when the finger moves downward on content that is scrolled to the top, so
 * scrolling, sliders and text fields behave as normal.
 *
 * Returns a ref callback for the element that moves.
 */
export function useSwipeToDismiss(onDismiss: () => void, enabled = true) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;

  useEffect(() => {
    if (!el || !enabled || !isTouchDevice()) return;

    let state: 'idle' | 'pending' | 'drag' | 'off' = 'idle';
    let x0 = 0;
    let y0 = 0;
    let t0 = 0;
    let dy = 0;
    const overlay = () => {
      const prev = el.previousElementSibling as HTMLElement | null;
      return prev?.hasAttribute('data-state') ? prev : null;
    };

    // Anything between the finger and the sheet that is scrolled, or wants the gesture itself
    const blocked = (target: EventTarget | null) => {
      for (let n = target as HTMLElement | null; n; n = n.parentElement) {
        if (n.matches?.(SKIP)) return true;
        if (n.scrollTop > 0) return true;
        if (n === el) break;
      }
      return false;
    };

    const reset = (animate: boolean) => {
      el.style.transition = animate ? 'translate 260ms cubic-bezier(0.32, 0.72, 0, 1)' : '';
      el.style.translate = '';
      const o = overlay();
      if (o) {
        o.style.transition = animate ? 'opacity 260ms ease' : '';
        o.style.opacity = '';
      }
      if (animate) setTimeout(() => (el.style.transition = ''), 280);
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || blocked(e.target)) {
        state = 'off';
        return;
      }
      state = 'pending';
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
      t0 = Date.now();
      dy = 0;
    };

    const onMove = (e: TouchEvent) => {
      if (state === 'off' || state === 'idle') return;
      const dx = e.touches[0].clientX - x0;
      const ddy = e.touches[0].clientY - y0;
      if (state === 'pending') {
        // Upward or sideways: leave it to scrolling
        if (ddy <= 0 || Math.abs(dx) > Math.abs(ddy)) {
          if (Math.abs(ddy) > 4 || Math.abs(dx) > 4) state = 'off';
          return;
        }
        e.preventDefault();
        if (ddy < 8) return;
        state = 'drag';
        el.style.transition = 'none';
      }
      e.preventDefault();
      dy = Math.max(0, ddy);
      el.style.translate = `0 ${dy}px`;
      const o = overlay();
      if (o) o.style.opacity = String(Math.max(0.2, 1 - dy / (el.offsetHeight || window.innerHeight)));
    };

    const onEnd = () => {
      if (state !== 'drag') {
        state = 'idle';
        return;
      }
      state = 'idle';
      const velocity = dy / Math.max(1, Date.now() - t0);
      const height = el.offsetHeight || window.innerHeight;
      if (dy > Math.min(150, height * 0.25) || (velocity > 0.55 && dy > 40)) {
        el.style.transition = 'translate 200ms ease-out';
        el.style.translate = `0 ${window.innerHeight}px`;
        const o = overlay();
        if (o) {
          o.style.transition = 'opacity 200ms ease-out';
          o.style.opacity = '0';
        }
        setTimeout(() => dismiss.current(), 170);
      } else {
        reset(true);
      }
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [el, enabled]);

  return setEl;
}
