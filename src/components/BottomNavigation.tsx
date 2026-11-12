import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { SECTIONS, sectionForPath } from "@/data/appDirectory";
import { setBottomNavHeight, useKeyboardLiftsPage } from "@/lib/bottomNav";
import { useNotifications } from "@/contexts/NotificationContext";
import CountBadge from "@/components/common/CountBadge";

/**
 * The five places everything lives (phones): Home, Bible, Church, Teams, Me, on a
 * floating "liquid glass" capsule like YouVersion's (iOS 26). The tab you're in sits
 * on a soft pill. Hold anywhere on the bar and the pill swells into a clear glass lens
 * with a rainbow rim that follows the finger, magnifying the tabs under it and
 * stretching as it moves; let go and it springs onto the tab under the finger and opens
 * it. A plain tap opens a tab as before; keyboards use the links. (Safari can't bend
 * the page behind glass as iOS does natively, so the lens magnifies the bar's own
 * icons, and the glass is a blur.)
 */
const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeId = sectionForPath(location.pathname);
  const active = Math.max(0, SECTIONS.findIndex((s) => s.id === activeId));
  // Like WhatsApp's Chats tab: how many chats have unread messages (Messages lives under Me)
  const { unreadChats } = useNotifications();
  const navRef = useRef<HTMLElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const magRef = useRef<HTMLDivElement>(null);
  // On every page, except while Android's keyboard has pushed the page up (it'd sit on the keyboard)
  const keyboardUp = useKeyboardLiftsPage();
  const hiddenRef = useRef(keyboardUp);
  hiddenRef.current = keyboardUp;

  // How much of the screen the bar takes, for full-screen layers that stop above it
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const measure = () => setBottomNavHeight(hiddenRef.current ? 0 : window.innerHeight - nav.getBoundingClientRect().top);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
      setBottomNavHeight(0);
    };
  }, []);
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (nav) setBottomNavHeight(keyboardUp ? 0 : window.innerHeight - nav.getBoundingClientRect().top);
  }, [keyboardUp]);

  // ── The lens ────────────────────────────────────────────────────────
  const [pressing, setPressing] = useState(false);
  const drag = useRef<{ id: number; startX: number; moved: boolean; lastX: number; lastT: number; stretch: number } | null>(null);
  const handled = useRef(false);
  const frame = useRef(0);

  const slot = () => (rowRef.current?.clientWidth ?? 0) / SECTIONS.length;
  /** Put the lens (centre x in the row, stretch 0–1) without React, every frame */
  const place = useCallback((x: number, stretch = 0, held = false) => {
    const lens = lensRef.current;
    const row = rowRef.current;
    if (!lens || !row) return;
    const w = lens.offsetWidth;
    const sx = (held ? 1.16 : 1) * (1 + stretch * 0.28);
    const sy = (held ? 1.16 : 1) * (1 - stretch * 0.12);
    lens.style.transform = `translate3d(${x - w / 2}px, -50%, 0) scale(${sx}, ${sy})`;
    // The magnified tabs inside the lens line up with the real ones under it
    if (magRef.current) {
      magRef.current.style.width = `${row.clientWidth}px`;
      magRef.current.style.transformOrigin = `${x}px 50%`;
      magRef.current.style.transform = `translateX(${w / 2 - x}px) scale(${held ? 1.12 : 1})`;
    }
  }, []);

  // At rest: on the open tab (springs there when it changes)
  useLayoutEffect(() => {
    if (!drag.current) place(slot() * (active + 0.5));
  }, [active, place]);
  useLayoutEffect(() => {
    const onResize = () => !drag.current && place(slot() * (active + 0.5));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [active, place]);

  const xIn = (clientX: number) => {
    const row = rowRef.current!;
    const r = row.getBoundingClientRect();
    const s = r.width / SECTIONS.length;
    return Math.min(r.width - s / 2, Math.max(s / 2, clientX - r.left));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || !rowRef.current) return;
    rowRef.current.setPointerCapture?.(e.pointerId);
    const x = xIn(e.clientX);
    drag.current = { id: e.pointerId, startX: e.clientX, moved: false, lastX: x, lastT: performance.now(), stretch: 0 };
    setPressing(true);
    handled.current = true;
    if ('vibrate' in navigator) navigator.vibrate?.(6);
    place(x, 0, true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (Math.abs(e.clientX - d.startX) > 6) d.moved = true;
    const x = xIn(e.clientX);
    const now = performance.now();
    const speed = Math.abs(x - d.lastX) / Math.max(8, now - d.lastT); // px per ms
    d.stretch = Math.min(1, d.stretch * 0.6 + speed * 0.5);
    d.lastX = x;
    d.lastT = now;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => place(x, d.stretch, true));
  };

  const finish = (e: React.PointerEvent, cancelled = false) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    cancelAnimationFrame(frame.current);
    setPressing(false);
    const s = slot();
    const index = Math.min(SECTIONS.length - 1, Math.max(0, Math.floor(d.lastX / (s || 1))));
    if (cancelled) {
      place(s * (active + 0.5));
      return;
    }
    // Springs onto the tab under the finger, and opens it (a tap opens the tab tapped)
    place(s * (index + 0.5));
    if ('vibrate' in navigator && index !== active) navigator.vibrate?.(8);
    navigate(SECTIONS[index].path);
    // The click that follows a pointer press has already been handled
    setTimeout(() => (handled.current = false), 400);
  };

  const tabRow = (magnified = false) =>
    SECTIONS.map((item, i) => {
      const isActive = i === active;
      const Icon = item.icon;
      const content = (
        <span className="relative flex flex-col items-center gap-[3px]">
          <span className="relative flex h-7 items-center justify-center">
            {item.id === 'me' && !magnified && <CountBadge count={unreadChats} className="-right-3 -top-1.5" label={unreadChats === 1 ? 'unread chat' : 'unread chats'} />}
            <Icon className={`h-[25px] w-[25px] ${isActive ? 'text-primary' : 'text-slate-800 dark:text-slate-100'}`} strokeWidth={isActive ? 2.4 : 2} />
          </span>
          <span className={`text-[11.5px] leading-none ${isActive ? 'font-bold text-primary' : 'font-semibold text-slate-800 dark:text-slate-100'}`}>{item.title}</span>
        </span>
      );
      return magnified ? (
        <span key={item.id} className="flex h-full flex-1 items-center justify-center">{content}</span>
      ) : (
        <Link
          key={item.id}
          to={item.path}
          aria-current={isActive ? 'page' : undefined}
          className="relative z-10 flex h-full min-w-0 flex-1 items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-full"
          draggable="false"
          onClick={(e) => {
            // Taps and slides are opened on lifting the finger; keyboards come through here
            if (handled.current) e.preventDefault();
          }}
        >
          {content}
        </Link>
      );
    });

  return (
    <nav
      ref={navRef}
      id="nav-v12-force-lift"
      aria-label="Main"
      className={`bottom-nav-bar pointer-events-none select-none [-webkit-touch-callout:none] fixed inset-x-0 bottom-0 z-[100] px-3 pb-[max(6px,env(safe-area-inset-bottom))]${keyboardUp ? ' hidden' : ''}`}
      onTouchStart={(e) => e.stopPropagation()}
      draggable="false"
    >
      <div className="liquid-capsule pointer-events-auto relative mx-auto h-[64px] max-w-[560px] rounded-full">
        <div
          ref={rowRef}
          data-tour="tabs"
          className="relative flex h-full w-full touch-none items-stretch px-1"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => finish(e)}
          onPointerCancel={(e) => finish(e, true)}
          onLostPointerCapture={(e) => drag.current && finish(e)}
        >
          {/* The pill under the open tab, which turns into the lens while held */}
          <div
            ref={lensRef}
            aria-hidden
            className={`liquid-lens pointer-events-none absolute left-0 top-1/2 z-0 h-[54px] overflow-hidden rounded-full ${pressing ? 'is-held' : ''}`}
            style={{ width: `calc((100% - 8px) / ${SECTIONS.length} + 6px)` }}
          >
            <div ref={magRef} className="liquid-mag absolute inset-y-0 left-0 flex" >
              {tabRow(true)}
            </div>
          </div>
          {tabRow()}
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigation;
