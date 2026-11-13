/**
 * No page-to-page swiping from the screen's edges (Nov 2026, the church's choice). iPhone's
 * Home Screen app (and Safari) treat a slide from the left or right edge as Back / Forward
 * through the pages visited, so sliding along the edge jumped between unrelated pages. A
 * touch that starts right at an edge is held back from Safari (`preventDefault` on
 * touchstart, which is what stops that gesture); a plain tap there is passed on as a click,
 * so buttons near the edge still work. The one place a slide from the left edge goes back is
 * an open chat, like WhatsApp: GroupChatsPage does that itself (`useChatSwipeBack`).
 */

// Narrow, so a thumb scrolling near the edge still scrolls; iPhone's gesture starts within ~20 px
export const EDGE_PX = 18;

function install() {
  if (typeof document === 'undefined') return;
  const iPhone = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!iPhone) return;
  let start: { x: number; y: number; t: number; target: EventTarget | null } | null = null;
  document.addEventListener(
    'touchstart',
    (e) => {
      start = null;
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      if (t.clientX > EDGE_PX && t.clientX < window.innerWidth - EDGE_PX) return;
      e.preventDefault();
      start = { x: t.clientX, y: t.clientY, t: Date.now(), target: e.target };
    },
    { passive: false, capture: true },
  );
  document.addEventListener(
    'touchend',
    (e) => {
      const s = start;
      start = null;
      if (!s || e.defaultPrevented) return;
      const t = e.changedTouches[0];
      // Only a tap (not a slide, not a hold) becomes the click Safari would have made
      if (!t || Math.hypot(t.clientX - s.x, t.clientY - s.y) > 10 || Date.now() - s.t > 600) return;
      const el = (document.elementFromPoint(t.clientX, t.clientY) ?? s.target) as HTMLElement | null;
      if (!el) return;
      if (el.matches('input, textarea, select, [contenteditable="true"]')) el.focus();
      el.click();
    },
    { capture: true },
  );
}

install();
