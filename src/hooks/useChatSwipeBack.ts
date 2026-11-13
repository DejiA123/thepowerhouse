import { useCallback, useEffect, useRef } from 'react';

/**
 * Slide from the left edge of an open chat to go back to the chat list, like WhatsApp
 * (phones only). The chat follows the finger and the list slides in underneath it; let go
 * past a third of the screen (or with a flick) and it finishes and closes the chat,
 * otherwise it springs back. Elsewhere in the app edge slides do nothing (lib/edgeSwipe.ts).
 */
const EDGE = 28;
const LIST_SHIFT = 0.28; // the list starts this far to the left, like iOS
const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

export function useChatSwipeBack(
  enabled: boolean,
  chatRef: React.RefObject<HTMLElement>,
  listRef: React.RefObject<HTMLElement>,
  onBack: () => void,
) {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  const busy = useRef(false);

  /** Back to how the page lays them out (after the chat closed, or sprang back) */
  const reset = useCallback(() => {
    busy.current = false;
    for (const el of [chatRef.current, listRef.current]) {
      if (!el) continue;
      el.style.transition = '';
      el.style.transform = '';
      el.style.display = '';
      el.style.position = '';
      el.style.inset = '';
      el.style.zIndex = '';
      el.style.boxShadow = '';
      el.style.pointerEvents = '';
    }
  }, [chatRef, listRef]);

  useEffect(() => {
    const chat = chatRef.current;
    const list = listRef.current;
    if (!enabled || !chat || !list) return;
    let start: { x: number; y: number } | null = null;
    let claimed = false;
    let dx = 0;
    let last = { x: 0, t: 0 };
    let speed = 0;
    let frame = 0;
    const width = () => chat.offsetWidth || window.innerWidth;
    const paint = () => {
      frame = 0;
      const w = width();
      const p = Math.min(1, Math.max(0, dx / w));
      chat.style.transform = `translate3d(${dx}px,0,0)`;
      list.style.transform = `translate3d(${-LIST_SHIFT * w * (1 - p)}px,0,0)`;
    };
    const claim = () => {
      claimed = true;
      // The list shows underneath while the chat slides
      list.style.display = 'block';
      list.style.position = 'absolute';
      list.style.inset = '0';
      list.style.zIndex = '0';
      list.style.pointerEvents = 'none';
      chat.style.position = 'relative';
      chat.style.zIndex = '1';
      chat.style.boxShadow = '-10px 0 30px rgba(15, 23, 42, 0.18)';
      chat.style.transition = 'none';
      list.style.transition = 'none';
    };
    const onStart = (e: TouchEvent) => {
      start = null;
      claimed = false;
      if (busy.current || e.touches.length !== 1 || window.innerWidth >= 768) return;
      const t = e.touches[0];
      if (t.clientX > EDGE) return;
      start = { x: t.clientX, y: t.clientY };
      dx = 0;
      speed = 0;
      last = { x: t.clientX, t: performance.now() };
    };
    const onMove = (e: TouchEvent) => {
      if (!start) return;
      const t = e.touches[0];
      const mx = t.clientX - start.x;
      const my = t.clientY - start.y;
      if (!claimed) {
        if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
        // Up/down: an ordinary scroll, not going back
        if (mx <= 0 || Math.abs(my) > Math.abs(mx)) {
          start = null;
          return;
        }
        claim();
      }
      e.preventDefault();
      const now = performance.now();
      if (now > last.t) speed = speed * 0.4 + ((t.clientX - last.x) / (now - last.t)) * 0.6;
      last = { x: t.clientX, t: now };
      dx = Math.max(0, mx);
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onEnd = () => {
      if (!start) return;
      start = null;
      if (!claimed) return;
      claimed = false;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      busy.current = true;
      const w = width();
      const done = dx > w * 0.35 || (speed > 0.3 && dx > 24);
      const ms = Math.round(Math.max(140, Math.min(300, (done ? w - dx : dx) / Math.max(0.6, Math.abs(speed)))));
      chat.style.transition = `transform ${ms}ms ${EASE}`;
      list.style.transition = `transform ${ms}ms ${EASE}`;
      chat.style.transform = `translate3d(${done ? w : 0}px,0,0)`;
      list.style.transform = `translate3d(${done ? 0 : -LIST_SHIFT * w}px,0,0)`;
      setTimeout(() => {
        if (done) onBackRef.current(); // the page resets the styles once the chat has closed
        else reset();
      }, ms + 20);
    };
    chat.addEventListener('touchstart', onStart, { passive: true });
    chat.addEventListener('touchmove', onMove, { passive: false });
    chat.addEventListener('touchend', onEnd);
    chat.addEventListener('touchcancel', onEnd);
    return () => {
      chat.removeEventListener('touchstart', onStart);
      chat.removeEventListener('touchmove', onMove);
      chat.removeEventListener('touchend', onEnd);
      chat.removeEventListener('touchcancel', onEnd);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [enabled, chatRef, listRef, reset]);

  return reset;
}
