import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { trackPageBg } from "@/lib/pageBg";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { SECTIONS, sectionForPath } from "@/data/appDirectory";
import { setBottomNavHeight, useKeyboardLiftsPage } from "@/lib/bottomNav";
import { useNotifications } from "@/contexts/NotificationContext";
import CountBadge from "@/components/common/CountBadge";

import { SOLID_TAB_ICONS } from "@/components/nav/TabIcons";

/**
 * The five places everything lives (phones): Home, Bible, Church, Teams, Me, on a
 * floating "liquid glass" capsule like YouVersion's (iOS 26). The open tab sits on a soft
 * grey pill with a solid black icon (`SOLID_TAB_ICONS`). A tap glides the pill to the tab.
 * Hold (0.2 s) or slide and the pill becomes a clear glass lens above the tabs that
 * follows the finger; the icon under it grows a little, smoothly, as it passes; let go and
 * it settles on that tab and opens it. All movement is one spring (stiffness/damping like
 * iOS, run every frame in `tick`), so it follows and settles smoothly instead of stepping;
 * it stretches only with its own speed. Keyboards use the links. Safari can't bend the
 * page behind glass as iOS does natively; the lens is clear glass with a bright rim.
 */
const STIFFNESS = 380;
const DAMPING = 2 * Math.sqrt(STIFFNESS) * 0.86; // a touch under critical: settles with the faintest give
const SCALE_STIFFNESS = 520;
const SCALE_DAMPING = 2 * Math.sqrt(SCALE_STIFFNESS) * 0.8;
const HELD_SCALE = 1.1;

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
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const iconRefs = useRef<(HTMLSpanElement | null)[]>([]);
  // On every page, except while Android's keyboard has pushed the page up (it'd sit on the keyboard)
  const keyboardUp = useKeyboardLiftsPage();
  const hiddenRef = useRef(keyboardUp);
  hiddenRef.current = keyboardUp;

  // How much of the screen the bar takes, for full-screen layers that stop above it (an open
  // chat ends above it, so its message box sits right on top of the bar).
  // The bar is pinned to the bottom, so that's simply its own height. It used to be "screen
  // height minus the bar's top", but iPhone can report a stale screen height for a moment
  // (as the keyboard closes, or as a Home Screen app comes back): that came out as 0, stuck
  // there, and the open chat ran down behind the bar, hiding the message box (Nov 2026).
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const timers: number[] = [];
    const measure = () => setBottomNavHeight(hiddenRef.current ? 0 : nav.offsetHeight);
    // Again shortly after anything that moves the screen around (the keyboard animates out)
    const settle = () => {
      measure();
      timers.push(window.setTimeout(measure, 150), window.setTimeout(measure, 500), window.setTimeout(measure, 1200));
      if (timers.length > 30) timers.splice(0, timers.length - 30);
    };
    const onVisible = () => document.visibilityState === 'visible' && settle();
    settle();
    const observer = new ResizeObserver(measure);
    observer.observe(nav, { box: 'border-box' });
    const vv = window.visualViewport;
    window.addEventListener('resize', settle);
    window.addEventListener('orientationchange', settle);
    window.addEventListener('pageshow', settle);
    document.addEventListener('visibilitychange', onVisible);
    document.addEventListener('focusout', settle);
    vv?.addEventListener('resize', settle);
    return () => {
      observer.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener('resize', settle);
      window.removeEventListener('orientationchange', settle);
      window.removeEventListener('pageshow', settle);
      document.removeEventListener('visibilitychange', onVisible);
      document.removeEventListener('focusout', settle);
      vv?.removeEventListener('resize', settle);
      setBottomNavHeight(0);
    };
  }, []);
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (nav) setBottomNavHeight(keyboardUp ? 0 : nav.offsetHeight);
  }, [keyboardUp]);

  // ── The lens: one spring for its place, one for its size ──────────────
  const [pressing, setPressing] = useState(false);
  const drag = useRef<{ id: number; startX: number; moved: boolean; held: boolean; lastX: number; timer?: ReturnType<typeof setTimeout> } | null>(null);
  const handled = useRef(false);
  const spring = useRef({ x: 0, v: 0, target: 0, s: 1, sv: 0, sTarget: 1, last: 0, frame: 0, ready: false });
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  /** Where each tab's middle is, in the row */
  const centres = () => {
    const row = rowRef.current;
    if (!row) return [] as number[];
    const left = row.getBoundingClientRect().left;
    return tabRefs.current.map((t) => (t ? t.getBoundingClientRect().left - left + t.offsetWidth / 2 : 0));
  };
  const nearest = (x: number) => {
    const c = centres();
    let best = 0;
    c.forEach((cx, i) => Math.abs(cx - x) < Math.abs(c[best] - x) && (best = i));
    return best;
  };

  const draw = useCallback(() => {
    const lens = lensRef.current;
    const sp = spring.current;
    if (!lens) return;
    const w = lens.offsetWidth;
    // Stretches with its own speed (smooth, because the spring's speed is)
    const stretch = Math.min(0.14, Math.abs(sp.v) / 3200);
    lens.style.transform = `translate3d(${sp.x - w / 2}px, -50%, 0) scale(${sp.s * (1 + stretch)}, ${sp.s * (1 - stretch * 0.35)})`;
    // The icon under the lens grows a little as it passes
    const lift = Math.max(0, Math.min(1, (sp.s - 1) / (HELD_SCALE - 1)));
    const c = centres();
    const slotW = (rowRef.current?.clientWidth ?? 1) / SECTIONS.length;
    iconRefs.current.forEach((el, i) => {
      if (!el) return;
      const near = Math.max(0, 1 - Math.abs(sp.x - (c[i] ?? 0)) / slotW);
      el.style.transform = lift > 0.01 ? `scale(${1 + 0.16 * lift * near})` : '';
    });
  }, []);

  const tick = useCallback((t: number) => {
    const sp = spring.current;
    const dt = Math.min(0.032, Math.max(0.001, (t - (sp.last || t)) / 1000) || 0.016);
    sp.last = t;
    if (reduced) {
      sp.x = sp.target;
      sp.v = 0;
      sp.s = sp.sTarget;
      sp.sv = 0;
    } else {
      sp.v += (STIFFNESS * (sp.target - sp.x) - DAMPING * sp.v) * dt;
      sp.x += sp.v * dt;
      sp.sv += (SCALE_STIFFNESS * (sp.sTarget - sp.s) - SCALE_DAMPING * sp.sv) * dt;
      sp.s += sp.sv * dt;
    }
    const settled = Math.abs(sp.target - sp.x) < 0.25 && Math.abs(sp.v) < 4 && Math.abs(sp.sTarget - sp.s) < 0.002 && Math.abs(sp.sv) < 0.02;
    if (settled && !drag.current) {
      sp.x = sp.target;
      sp.v = 0;
      sp.s = sp.sTarget;
      sp.sv = 0;
    }
    draw();
    if (settled && !drag.current) {
      sp.frame = 0;
      sp.last = 0;
    } else sp.frame = requestAnimationFrame(tick);
  }, [draw, reduced]);

  const run = useCallback(() => {
    const sp = spring.current;
    if (!sp.frame) sp.frame = requestAnimationFrame(tick);
  }, [tick]);
  useEffect(() => () => cancelAnimationFrame(spring.current.frame), []);

  // At rest: on the open tab (glides there when it changes; placed straight there the first time)
  useLayoutEffect(() => {
    if (drag.current) return;
    const sp = spring.current;
    const x = centres()[active] ?? 0;
    sp.target = x;
    sp.sTarget = 1;
    if (!sp.ready) {
      sp.ready = true;
      sp.x = x;
      draw();
      return;
    }
    run();
  }, [active, draw, run]);
  useLayoutEffect(() => {
    const onResize = () => {
      if (drag.current) return;
      const sp = spring.current;
      sp.x = sp.target = centres()[active] ?? 0;
      draw();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [active, draw]);

  const xIn = (clientX: number) => {
    const c = centres();
    const x = clientX - (rowRef.current?.getBoundingClientRect().left ?? 0);
    return Math.min(c[c.length - 1] ?? x, Math.max(c[0] ?? x, x));
  };

  const hold = (d: NonNullable<typeof drag.current>) => {
    if (d.held) return;
    d.held = true;
    setPressing(true);
    if ('vibrate' in navigator) navigator.vibrate?.(6);
    const sp = spring.current;
    sp.target = d.lastX;
    sp.sTarget = HELD_SCALE;
    run();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || !rowRef.current) return;
    rowRef.current.setPointerCapture?.(e.pointerId);
    const d = { id: e.pointerId, startX: e.clientX, moved: false, held: false, lastX: xIn(e.clientX) } as NonNullable<typeof drag.current>;
    drag.current = d;
    handled.current = true;
    // A quick tap just opens the tab (the pill glides there); the lens only comes up for a hold or a slide
    d.timer = setTimeout(() => drag.current === d && hold(d), 200);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    d.lastX = xIn(e.clientX);
    if (Math.abs(e.clientX - d.startX) > 6) d.moved = true;
    if (!d.held) {
      if (!d.moved) return;
      clearTimeout(d.timer);
      hold(d);
      return;
    }
    // The spring follows the finger (a little behind it, like liquid)
    spring.current.target = d.lastX;
    run();
  };

  const finish = (e: React.PointerEvent, cancelled = false) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    clearTimeout(d.timer);
    setPressing(false);
    const index = cancelled ? active : nearest(d.lastX);
    const sp = spring.current;
    sp.target = centres()[index] ?? sp.target;
    sp.sTarget = 1;
    run();
    if (cancelled) return;
    if ('vibrate' in navigator && index !== active) navigator.vibrate?.(8);
    navigate(SECTIONS[index].path);
    // The click that follows a pointer press has already been handled
    setTimeout(() => (handled.current = false), 400);
  };

  const tabRow = () =>
    SECTIONS.map((item, i) => {
      const isActive = i === active;
      const Icon = item.icon;
      const Solid = SOLID_TAB_ICONS[item.id];
      return (
        <Link
          key={item.id}
          ref={(el) => (tabRefs.current[i] = el)}
          to={item.path}
          aria-current={isActive ? 'page' : undefined}
          className="relative z-10 flex h-full min-w-0 flex-1 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          draggable="false"
          onClick={(e) => {
            // Taps and slides are opened on lifting the finger; keyboards come through here
            if (handled.current) e.preventDefault();
          }}
        >
          <span ref={(el) => (iconRefs.current[i] = el)} className="relative flex flex-col items-center gap-[3px] will-change-transform">
            <span className="relative flex h-7 items-center justify-center">
              {item.id === 'me' && <CountBadge count={unreadChats} className="-right-3 -top-1.5" label={unreadChats === 1 ? 'unread chat' : 'unread chats'} />}
              {/* The open tab: a solid black icon, like YouVersion */}
              {isActive && Solid ? (
                <Solid className="h-[25px] w-[25px] text-slate-900 dark:text-white" />
              ) : (
                <Icon className="h-[25px] w-[25px] text-slate-800 dark:text-slate-200" strokeWidth={1.9} />
              )}
            </span>
            <span className={`text-[11.5px] leading-none ${isActive ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-800 dark:text-slate-200'}`}>{item.title}</span>
          </span>
        </Link>
      );
    });

  // The fade under the bar takes the page's real background colour (lib/pageBg.ts)
  useEffect(() => trackPageBg(), []);

  return (
    <nav
      ref={navRef}
      id="nav-v12-force-lift"
      aria-label="Main"
      className={`bottom-nav-bar pointer-events-none select-none [-webkit-touch-callout:none] fixed inset-x-0 bottom-0 z-[100] px-3 pb-[max(6px,env(safe-area-inset-bottom))]${keyboardUp ? ' hidden' : ''}`}
      onTouchStart={(e) => e.stopPropagation()}
      draggable="false"
    >
      {/* Like YouVersion: the page fades out under the floating bar (and a little above it),
          in the page's own background colour, so text never runs hard into the glass */}
      <div aria-hidden className="nav-fade pointer-events-none absolute inset-x-0 bottom-0 -top-8" />
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
          {/* The pill under the open tab, which turns into the clear lens while held */}
          <div
            ref={lensRef}
            aria-hidden
            className={`liquid-lens pointer-events-none absolute left-0 top-1/2 h-[54px] rounded-full ${pressing ? 'is-held' : ''}`}
            style={{ width: `calc((100% - 8px) / ${SECTIONS.length} + 6px)` }}
          />
          {tabRow()}
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigation;
